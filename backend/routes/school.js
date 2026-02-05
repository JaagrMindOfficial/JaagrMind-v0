const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const School = require('../models/School');
const Student = require('../models/Student');
const Assessment = require('../models/Assessment');
const Submission = require('../models/Submission');
const ArchivedData = require('../models/ArchivedData');
const SchoolCredentials = require('../models/SchoolCredentials');
const { protect, isSchoolAdmin, generateToken } = require('../middleware/auth');
const { generateAccessId, generateBulkAccessIds } = require('../utils/idGenerator');
const { exportAccessIdsToExcel, calculateAnalytics, getSectionName } = require('../utils/exportData');
const { sendPasswordChangedEmail } = require('../utils/emailService');

// Configure multer for Excel uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /xlsx|xls|csv/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Only Excel/CSV files are allowed'));
    }
});

// @route   POST /api/school/login
// @desc    School admin login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { schoolId, password } = req.body;

        const school = await School.findOne({
            schoolId: schoolId.toUpperCase(),
            isActive: true
        }).populate('assignedTests', 'title isDefault');

        if (!school) {
            return res.status(401).json({ message: 'Invalid school ID or password' });
        }

        // Check if school is blocked
        if (school.isBlocked) {
            return res.status(403).json({ message: 'This school account has been blocked. Please contact administrator.' });
        }

        const isMatch = await school.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid school ID or password' });
        }

        res.json({
            _id: school._id,
            schoolId: school.schoolId,
            email: school.email,
            name: school.name,
            logo: school.logo,
            isDataVisibleToSchool: school.isDataVisibleToSchool,
            mustChangePassword: school.mustChangePassword || false,
            role: 'school',
            token: generateToken(school._id, 'school')
        });
    } catch (error) {
        console.error('School login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/change-password
// @desc    Change school password (mandatory on first login)
// @access  School Admin
router.put('/change-password', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const school = await School.findById(req.school._id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        // Verify current password (skip if first-time change)
        if (!school.mustChangePassword) {
            const isMatch = await school.matchPassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
        }

        // Update password
        school.password = newPassword;
        school.plainPassword = newPassword;
        school.mustChangePassword = false;
        await school.save();

        // Update SchoolCredentials
        await SchoolCredentials.updatePassword(school._id, newPassword);

        // Send notification email
        if (school.email) {
            await sendPasswordChangedEmail(school.email, school.name);
        }

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/dashboard
// @desc    Get school dashboard overview
// @access  School Admin
router.get('/dashboard', protect, isSchoolAdmin, async (req, res) => {
    try {
        const schoolId = req.school._id;

        const [studentCount, completedCount] = await Promise.all([
            Student.countDocuments({ schoolId, isActive: true }),
            // Count unique students who have completed submissions (status='complete')
            Submission.distinct('studentId', { schoolId, status: 'complete' }).then(arr => arr.length)
        ]);

        // Get class breakdown
        const classStats = await Student.aggregate([
            { $match: { schoolId: req.school._id, isActive: true } },
            { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
            { $sort: { '_id.class': 1, '_id.section': 1 } }
        ]);

        const school = await School.findById(schoolId)
            .populate('assignedTests', 'title isDefault questionCount');

        // Ensure pending is never negative
        const pendingTests = Math.max(0, studentCount - completedCount);

        res.json({
            school: {
                name: school.name,
                logo: school.logo,
                schoolId: school.schoolId
            },
            stats: {
                totalStudents: studentCount,
                completedTests: completedCount,
                pendingTests: pendingTests
            },
            classStats,
            assignedTests: school.assignedTests
        });
    } catch (error) {
        console.error('School dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/students
// @desc    Get all students with filters (with pagination)
// @access  School Admin
router.get('/students', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { class: className, section, status, page: pageParam, limit: limitParam } = req.query;
        const page = parseInt(pageParam) || 1;
        const limit = parseInt(limitParam) || 20;
        const skip = (page - 1) * limit;

        let query = { schoolId: req.school._id, isActive: true };

        if (className) query.class = className;
        if (section) query.section = section;

        // Get total count for this query
        let total = await Student.countDocuments(query);

        let students = await Student.find(query)
            .populate('testStatus.assessmentId', 'title')
            .sort({ class: 1, section: 1, rollNo: 1, name: 1 })
            .skip(skip)
            .limit(limit);

        // Filter by completion status if requested (done after pagination for consistency)
        if (status === 'completed') {
            students = students.filter(s =>
                s.testStatus.some(t => t.isCompleted)
            );
        } else if (status === 'pending') {
            students = students.filter(s =>
                !s.testStatus.some(t => t.isCompleted)
            );
        }

        res.json({
            data: students,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/students
// @desc    Add single student
// @access  School Admin
router.post('/students', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { name, rollNo, class: className, section } = req.body;

        // Check for duplicate student (same rollNo + class + section + name)
        const existingStudent = await Student.findOne({
            schoolId: req.school._id,
            isActive: true,
            name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
            class: className,
            section: section || '',
            rollNo: rollNo || ''
        });

        if (existingStudent) {
            return res.status(400).json({
                message: 'A student with the same name, roll number, class and section already exists'
            });
        }

        const accessId = generateAccessId(req.school.name);

        // Get default assessment for this school
        const school = await School.findById(req.school._id).populate('assignedTests');
        const defaultTest = school.assignedTests.find(t => t.isDefault) || school.assignedTests[0];

        const student = await Student.create({
            accessId,
            name: name.trim(),
            rollNo: rollNo?.trim() || '',
            class: className,
            section: section?.trim() || '',
            schoolId: req.school._id,
            testStatus: defaultTest ? [{
                assessmentId: defaultTest._id,
                isCompleted: false
            }] : []
        });

        res.status(201).json(student);
    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/students/import
// @desc    Bulk import students from Excel
// @access  School Admin
router.post('/students/import', protect, isSchoolAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            return res.status(400).json({ message: 'No data found in file' });
        }

        // Get school and default test
        const school = await School.findById(req.school._id).populate('assignedTests');
        const defaultTest = school.assignedTests.find(t => t.isDefault) || school.assignedTests[0];

        // Get existing students for duplicate check
        const existingStudents = await Student.find({
            schoolId: req.school._id,
            isActive: true
        }).select('name rollNo class section');

        const existingSet = new Set(
            existingStudents.map(s =>
                `${s.name.toLowerCase().trim()}|${s.rollNo?.trim() || ''}|${s.class?.trim() || ''}|${s.section?.trim() || ''}`
            )
        );

        const students = [];
        const errors = [];
        const duplicates = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const name = row.Name || row.name || row.NAME || row['Student Name'];
            const rollNo = row.RollNo || row.rollNo || row['Roll No'] || row['roll_no'] || '';
            const className = row.Class || row.class || row.CLASS || '';
            const section = row.Section || row.section || row.SECTION || '';

            if (!name || !className) {
                errors.push({ row: i + 2, error: 'Name and Class are required' });
                continue;
            }

            // Check for duplicate
            const key = `${name.toString().toLowerCase().trim()}|${rollNo.toString().trim()}|${className.toString().trim()}|${section.toString().trim()}`;
            if (existingSet.has(key)) {
                duplicates.push({ row: i + 2, name: name.toString().trim() });
                continue;
            }
            existingSet.add(key); // Also track within batch

            students.push({
                name: name.toString().trim(),
                rollNo: rollNo.toString().trim(),
                class: className.toString().trim(),
                section: section.toString().trim(),
                schoolId: req.school._id,
                testStatus: defaultTest ? [{
                    assessmentId: defaultTest._id,
                    isCompleted: false
                }] : []
            });
        }

        // Generate access IDs for valid students only
        if (students.length > 0) {
            const accessIds = await generateBulkAccessIds(Student, school.name, students.length);
            students.forEach((s, i) => s.accessId = accessIds[i]);

            // Insert all students
            const created = await Student.insertMany(students, { ordered: false });

            res.status(201).json({
                message: `${created.length} students imported successfully`,
                imported: created.length,
                duplicates: duplicates.length > 0 ? duplicates : undefined,
                errors: errors.length > 0 ? errors : undefined
            });
        } else {
            res.status(400).json({
                message: 'No valid students to import',
                duplicates: duplicates.length > 0 ? duplicates : undefined,
                errors: errors.length > 0 ? errors : undefined
            });
        }
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ message: 'Error importing students' });
    }
});

// @route   PUT /api/school/students/:id
// @desc    Update student
// @access  School Admin
router.put('/students/:id', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { name, rollNo, class: className, section } = req.body;

        const student = await Student.findOne({
            _id: req.params.id,
            schoolId: req.school._id
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        student.name = name || student.name;
        student.rollNo = rollNo || student.rollNo;
        student.class = className || student.class;
        student.section = section || student.section;

        await student.save();

        res.json(student);
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/school/students/:id
// @desc    Delete student (archive first, then hard delete)
// @access  School Admin
router.delete('/students/:id', protect, isSchoolAdmin, async (req, res) => {
    try {
        const student = await Student.findOne({
            _id: req.params.id,
            schoolId: req.school._id
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get student's submissions for archival
        const submissions = await Submission.find({ studentId: student._id })
            .populate('assessmentId', 'title');

        // Archive student data before deletion
        await ArchivedData.create({
            type: 'student',
            archivedBy: 'school',
            reason: 'manual_deletion',
            studentData: {
                _id: student._id,
                accessId: student.accessId,
                name: student.name,
                rollNo: student.rollNo,
                class: student.class,
                section: student.section,
                schoolId: student.schoolId,
                schoolName: req.school.name,
                testStatus: student.testStatus,
                createdAt: student.createdAt
            },
            studentSubmissions: submissions.map(sub => ({
                assessmentId: sub.assessmentId?._id,
                assessmentTitle: sub.assessmentId?.title,
                totalScore: sub.totalScore,
                sectionScores: sub.sectionScores,
                assignedBucket: sub.assignedBucket,
                submittedAt: sub.submittedAt,
                answers: sub.answers
            })),
            stats: {
                submissionCount: submissions.length
            }
        });

        // Delete associated submissions
        await Submission.deleteMany({ studentId: student._id });

        // Hard delete the student
        await Student.findByIdAndDelete(req.params.id);

        res.json({ message: 'Student archived and deleted successfully' });
    } catch (error) {
        console.error('Delete student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/school/students/:id/reset
// @desc    Reset student test
// @access  School Admin
router.put('/students/:id/reset', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { assessmentId } = req.body;

        const student = await Student.findOne({
            _id: req.params.id,
            schoolId: req.school._id
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Find and reset the specific test status
        const testIndex = student.testStatus.findIndex(
            t => t.assessmentId.toString() === assessmentId
        );

        if (testIndex >= 0) {
            student.testStatus[testIndex].isCompleted = false;
            student.testStatus[testIndex].score = 0;
            student.testStatus[testIndex].sectionScores = { A: 0, B: 0, C: 0, D: 0 };
            student.testStatus[testIndex].sectionBuckets = { A: '', B: '', C: '', D: '' };
            student.testStatus[testIndex].bucket = '';
            student.testStatus[testIndex].completedAt = null;
        }

        await student.save();

        // Also delete the submission
        await Submission.deleteOne({
            studentId: student._id,
            assessmentId
        });

        res.json({ message: 'Test reset successfully' });
    } catch (error) {
        console.error('Reset test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/classes
// @desc    Get unique classes and sections
// @access  School Admin
router.get('/classes', protect, isSchoolAdmin, async (req, res) => {
    try {
        const classes = await Student.aggregate([
            { $match: { schoolId: req.school._id, isActive: true } },
            {
                $group: {
                    _id: { class: '$class', section: '$section' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.class': 1, '_id.section': 1 } }
        ]);

        // Get unique class names
        const uniqueClasses = [...new Set(classes.map(c => c._id.class))];

        res.json({ classes, uniqueClasses });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/tests
// @desc    Get assigned tests
// @access  School Admin
router.get('/tests', protect, isSchoolAdmin, async (req, res) => {
    try {
        const school = await School.findById(req.school._id)
            .populate('assignedTests', 'title description isDefault timePerQuestion questions customSections');

        res.json(school.assignedTests);
    } catch (error) {
        console.error('Get tests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/available-assessments
// @desc    Get all assessments available to this school (from pool)
// @access  School Admin
router.get('/available-assessments', protect, isSchoolAdmin, async (req, res) => {
    try {
        const school = await School.findById(req.school._id)
            .populate('assignedTests', 'title description isDefault timePerQuestion questions customSections');

        // Get count of students assigned to each assessment
        const assessmentStats = await Promise.all(
            school.assignedTests.map(async (assessment) => {
                const assignedCount = await Student.countDocuments({
                    schoolId: req.school._id,
                    isActive: true,
                    'testStatus.assessmentId': assessment._id
                });
                const completedCount = await Submission.countDocuments({
                    schoolId: req.school._id,
                    assessmentId: assessment._id,
                    status: 'complete'  // Only count complete submissions
                });
                return {
                    ...assessment.toObject(),
                    assignedStudents: assignedCount,
                    completedStudents: completedCount,
                    questionCount: assessment.questions?.length || 0
                };
            })
        );

        res.json(assessmentStats);
    } catch (error) {
        console.error('Get available assessments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/tests/assign
// @desc    Assign test to class/section/student
// @access  School Admin
router.post('/tests/assign', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { assessmentId, targetType, targetClass, targetSection, studentIds } = req.body;

        let query = { schoolId: req.school._id, isActive: true };

        if (targetType === 'class') {
            query.class = targetClass;
        } else if (targetType === 'section') {
            query.class = targetClass;
            query.section = targetSection;
        } else if (targetType === 'students' && studentIds) {
            query._id = { $in: studentIds };
        }

        const students = await Student.find(query);

        for (const student of students) {
            const existingTest = student.testStatus.find(
                t => t.assessmentId.toString() === assessmentId
            );

            if (!existingTest) {
                student.testStatus.push({
                    assessmentId,
                    isCompleted: false
                });
                await student.save();
            }
        }

        res.json({
            message: `Test assigned to ${students.length} students`,
            assignedCount: students.length
        });
    } catch (error) {
        console.error('Assign test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/tests/unassign
// @desc    Unassign test from specific students
// @access  School Admin
router.post('/tests/unassign', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { assessmentId, studentIds } = req.body;

        if (!studentIds || studentIds.length === 0) {
            return res.status(400).json({ message: 'No students selected' });
        }

        const students = await Student.find({
            _id: { $in: studentIds },
            schoolId: req.school._id,
            isActive: true
        });

        let unassignedCount = 0;
        for (const student of students) {
            const testIndex = student.testStatus.findIndex(
                t => t.assessmentId.toString() === assessmentId
            );

            if (testIndex !== -1) {
                // Only unassign if not completed
                if (!student.testStatus[testIndex].isCompleted) {
                    student.testStatus.splice(testIndex, 1);
                    await student.save();
                    unassignedCount++;
                }
            }
        }

        res.json({
            message: `Test unassigned from ${unassignedCount} students`,
            unassignedCount
        });
    } catch (error) {
        console.error('Unassign test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/test-status
// @desc    Get test completion status
// @access  School Admin
router.get('/test-status', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { assessmentId, class: className, section } = req.query;

        let query = { schoolId: req.school._id, isActive: true };
        if (className) query.class = className;
        if (section) query.section = section;

        const students = await Student.find(query)
            .select('name accessId class section rollNo testStatus')
            .sort({ class: 1, section: 1, name: 1 });

        const status = students.map(s => {
            const test = s.testStatus.find(
                t => t.assessmentId.toString() === assessmentId
            );
            return {
                _id: s._id,
                name: s.name,
                accessId: s.accessId,
                class: s.class,
                section: s.section,
                rollNo: s.rollNo,
                status: test?.isCompleted ? 'Completed' : 'Pending',
                completedAt: test?.completedAt
            };
        });

        res.json(status);
    } catch (error) {
        console.error('Get test status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/export-ids
// @desc    Export access IDs to Excel
// @access  School Admin
router.get('/export-ids', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { class: className, section } = req.query;

        let query = { schoolId: req.school._id, isActive: true };
        if (className) query.class = className;
        if (section) query.section = section;

        const students = await Student.find(query)
            .select('accessId name rollNo class section')
            .sort({ class: 1, section: 1, rollNo: 1 });

        const workbook = await exportAccessIdsToExcel(students, req.school.name);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=access-ids-${req.school.schoolId}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export IDs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/analytics
// @desc    Get school analytics (if allowed)
// @access  School Admin
router.get('/analytics', protect, isSchoolAdmin, async (req, res) => {
    try {
        // Check if data visibility is allowed
        const school = await School.findById(req.school._id);
        if (!school.isDataVisibleToSchool) {
            return res.status(403).json({
                message: 'Analytics not available. Please contact admin.'
            });
        }

        const { class: className, section } = req.query;

        // Build student filter
        let studentQuery = { schoolId: req.school._id, isActive: true };
        if (className) studentQuery.class = className;
        if (section) studentQuery.section = section;

        // Get filtered student IDs
        const filteredStudents = await Student.find(studentQuery).select('_id');
        const studentIds = filteredStudents.map(s => s._id);

        // Get submissions for filtered students (only complete ones for analytics)
        const submissions = await Submission.find({
            schoolId: req.school._id,
            studentId: { $in: studentIds },
            status: 'complete'  // Only include complete submissions in analytics
        })
            .populate('studentId', 'name accessId class section')
            .sort({ submittedAt: -1 });

        const analytics = calculateAnalytics(submissions);

        res.json({
            ...analytics,
            recentSubmissions: submissions.slice(0, 20),
            filters: { class: className || null, section: section || null }
        });
    } catch (error) {
        console.error('School analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/assessment-link/:assessmentId
// @desc    Get shareable assessment link
// @access  School Admin
router.get('/assessment-link/:assessmentId', protect, isSchoolAdmin, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Use only the primary frontend URL (first one if comma-separated)
        const frontendUrls = process.env.FRONTEND_URL || 'https://www.jaagrmind.com';
        const baseUrl = frontendUrls.split(',')[0].trim();
        const link = `${baseUrl}/student/login?school=${req.school.schoolId}&test=${req.params.assessmentId}`;

        res.json({
            link,
            schoolName: req.school.name,
            assessmentTitle: assessment.title
        });
    } catch (error) {
        console.error('Get link error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/students-analytics
// @desc    Get all students with their submission data for school panel
// @access  School Admin
router.get('/students-analytics', protect, isSchoolAdmin, async (req, res) => {
    try {
        const school = await School.findById(req.school._id);
        if (!school.isDataVisibleToSchool) {
            return res.status(403).json({
                message: 'Analytics not available. Please contact admin.'
            });
        }

        const { class: className, section, assessmentId, search } = req.query;

        // Build student query
        let studentQuery = { schoolId: req.school._id, isActive: true };
        if (className) studentQuery.class = className;
        if (section) studentQuery.section = section;
        if (search) {
            studentQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { accessId: { $regex: search, $options: 'i' } },
                { rollNo: { $regex: search, $options: 'i' } }
            ];
        }

        const students = await Student.find(studentQuery)
            .select('name accessId class section rollNo')
            .sort({ class: 1, section: 1, name: 1 });

        // Get submissions for these students
        let submissionQuery = {
            schoolId: req.school._id,
            studentId: { $in: students.map(s => s._id) }
        };
        if (assessmentId) {
            submissionQuery.assessmentId = assessmentId;
        }

        const submissions = await Submission.find(submissionQuery)
            .populate('assessmentId', 'title')
            .select('studentId assessmentId totalScore sectionScores assignedBucket submittedAt');

        // Map submissions by student
        const submissionsByStudent = {};
        submissions.forEach(sub => {
            const studentIdStr = sub.studentId.toString();
            if (!submissionsByStudent[studentIdStr]) {
                submissionsByStudent[studentIdStr] = [];
            }
            submissionsByStudent[studentIdStr].push({
                assessmentId: sub.assessmentId?._id,
                assessmentTitle: sub.assessmentId?.title,
                totalScore: sub.totalScore,
                sectionScores: sub.sectionScores,
                bucket: sub.assignedBucket,
                submittedAt: sub.submittedAt
            });
        });

        // Build response
        const studentsWithAnalytics = students.map(student => ({
            _id: student._id,
            name: student.name,
            accessId: student.accessId,
            class: student.class,
            section: student.section,
            rollNo: student.rollNo,
            submissions: submissionsByStudent[student._id.toString()] || [],
            latestSubmission: submissionsByStudent[student._id.toString()]?.[0] || null
        }));

        // Get filter options
        const allStudents = await Student.find({ schoolId: req.school._id, isActive: true })
            .select('class section');
        const uniqueClasses = [...new Set(allStudents.map(s => s.class))].sort();
        const uniqueSections = className
            ? [...new Set(allStudents.filter(s => s.class === className).map(s => s.section))].sort()
            : [];

        const assessments = await Assessment.find({
            _id: { $in: school.assignedTests },
            isActive: true
        }).select('title');

        res.json({
            students: studentsWithAnalytics,
            totalStudents: studentsWithAnalytics.length,
            filters: {
                classes: uniqueClasses,
                sections: uniqueSections,
                assessments: assessments
            }
        });
    } catch (error) {
        console.error('School students analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/student/:id/details
// @desc    Get detailed student info with all submissions and answers
// @access  School Admin
router.get('/student/:id/details', protect, isSchoolAdmin, async (req, res) => {
    try {
        const student = await Student.findOne({
            _id: req.params.id,
            schoolId: req.school._id,
            isActive: true
        });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get all submissions for this student with full details
        const submissions = await Submission.find({
            studentId: student._id
        })
            .populate('assessmentId', 'title questions customSections')
            .sort({ submittedAt: -1 });

        // Format submissions with detailed answer breakdown
        const detailedSubmissions = submissions.map(sub => {
            const assessment = sub.assessmentId;
            const questions = assessment?.questions || [];

            // Map answers to questions
            const answersWithQuestions = (sub.answers || []).map((answer, index) => {
                const question = questions[answer?.questionIndex ?? index];
                return {
                    questionIndex: (answer?.questionIndex ?? index) + 1,
                    questionText: question?.text || `Question ${index + 1}`,
                    section: question?.section || 'Unknown',
                    sectionName: getSectionName(question?.section),
                    selectedOption: answer?.selectedOption ?? null,
                    options: question?.options || [],
                    score: answer?.marks ?? 0,
                    isReverseScored: question?.isReverseScored || false
                };
            });

            // Group answers by section
            const answersBySection = {};
            answersWithQuestions.forEach(a => {
                if (!answersBySection[a.section]) {
                    answersBySection[a.section] = {
                        sectionName: a.sectionName,
                        answers: [],
                        totalScore: 0
                    };
                }
                answersBySection[a.section].answers.push(a);
                answersBySection[a.section].totalScore += a.score;
            });

            return {
                _id: sub._id,
                assessmentId: assessment?._id,
                assessmentTitle: assessment?.title || 'Unknown Assessment',
                totalScore: sub.totalScore,
                sectionScores: sub.sectionScores,
                sectionBuckets: sub.sectionBuckets,
                assignedBucket: sub.assignedBucket,
                primarySkillArea: sub.primarySkillArea,
                secondarySkillArea: sub.secondarySkillArea,
                timeTaken: sub.timeTaken,
                totalInactivityTime: sub.totalInactivityTime,
                moodCheck: sub.moodCheck,
                status: sub.status,
                submittedAt: sub.submittedAt,
                answersWithQuestions,
                answersBySection
            };
        });

        res.json({
            student: {
                _id: student._id,
                name: student.name,
                accessId: student.accessId,
                class: student.class,
                section: student.section,
                rollNo: student.rollNo,
                createdAt: student.createdAt
            },
            submissions: detailedSubmissions,
            totalSubmissions: detailedSubmissions.length
        });
    } catch (error) {
        console.error('Student details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
