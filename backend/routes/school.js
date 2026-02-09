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
const { generateAccessId, generateBulkAccessIds, generateSchoolId, generateSchoolPassword } = require('../utils/idGenerator');
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
        }).populate('assignedTests', 'title isDefault')
            .populate('parentId', 'name schoolId');

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
            type: school.type,
            parentId: school.parentId,
            address: school.address,
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

// @route   PUT /api/school/profile
// @desc    Update school profile
// @access  School Admin
router.put('/profile', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { name, email, phone, address, city, state, pincode } = req.body;

        const school = await School.findById(req.school._id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        // Update fields
        if (name) school.name = name;
        if (phone) school.contact.phone = phone;

        // Update email if changed (and check uniqueness)
        if (email && email.toLowerCase() !== school.email) {
            const emailExists = await School.findOne({ email: email.toLowerCase() });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            school.email = email.toLowerCase();
            school.contact.email = email.toLowerCase();

            // Update credentials
            await SchoolCredentials.findOneAndUpdate(
                { schoolId: school._id },
                { email: email.toLowerCase() }
            );
        }

        // Update address
        if (address !== undefined || city !== undefined || state !== undefined || pincode !== undefined) {
            school.address = {
                street: address !== undefined ? address : school.address.street,
                city: city !== undefined ? city : school.address.city,
                state: state !== undefined ? state : school.address.state,
                pincode: pincode !== undefined ? pincode : school.address.pincode,
                full: `${address || school.address.street}${city || school.address.city ? ', ' + (city || school.address.city) : ''}${state || school.address.state ? ', ' + (state || school.address.state) : ''}`
            };
        }

        await school.save();

        res.json({
            message: 'Profile updated successfully',
            school: {
                name: school.name,
                email: school.email,
                contact: school.contact,
                address: school.address
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/branches
// @desc    Get all sub-schools (branches)
// @access  School Admin (Super School only)
router.get('/branches', protect, isSchoolAdmin, async (req, res) => {
    try {
        // Only Super Schools can have branches
        // But for now, any school can check (if type isn't migrated yet, it might default to super)
        const branches = await School.find({
            parentId: req.school._id,
            isActive: true
        })
            .select('-password -plainPassword')
            .sort({ createdAt: -1 });

        // Add stats to branches
        const branchesWithStats = await Promise.all(branches.map(async (branch) => {
            const studentCount = await Student.countDocuments({ schoolId: branch._id, isActive: true });
            const submissionCount = await Submission.countDocuments({ schoolId: branch._id });
            return {
                ...branch.toObject(),
                stats: { studentCount, submissionCount }
            };
        }));

        res.json(branchesWithStats);
    } catch (error) {
        console.error('Get branches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/branches
// @desc    Get all branches for this school
// @access  School Admin (Super School only)
router.get('/branches', protect, isSchoolAdmin, async (req, res) => {
    try {
        const branches = await School.find({
            parentId: req.school._id,
            isActive: true
        }).select('name schoolId email address contact logo isBlocked isDataVisibleToSchool studentCount submissionCount');

        // Get meaningful stats for each branch (optional, but good for dashboard)
        const branchesWithStats = await Promise.all(branches.map(async (branch) => {
            const studentCount = await Student.countDocuments({ schoolId: branch._id, isActive: true });
            return {
                ...branch.toObject(),
                stats: {
                    studentCount
                }
            };
        }));

        res.json(branchesWithStats);
    } catch (error) {
        console.error('Get branches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/branches
// @desc    Create a new sub-school (branch)
// @access  School Admin (Super School only)
router.post('/branches', protect, isSchoolAdmin, upload.single('logo'), async (req, res) => {
    try {
        const { name, address, city, state, pincode, phone, email, isDataVisibleToSchool, sendEmail } = req.body;

        // Check if current school is a Super School
        // Note: We might need to fetch fresh school data if req.school doesn't have 'type'
        const currentSchool = await School.findById(req.school._id);
        if (currentSchool.type === 'sub') {
            return res.status(403).json({ message: 'Sub-schools cannot create branches' });
        }

        if (!email) {
            return res.status(400).json({ message: 'Email is required for branch registration' });
        }

        const existingSchool = await School.findOne({ email: email.toLowerCase() });
        if (existingSchool) {
            if (existingSchool.isActive === false) {
                await School.findByIdAndDelete(existingSchool._id);
                await SchoolCredentials.deleteMany({ schoolId: existingSchool._id });
            } else {
                return res.status(400).json({ message: 'A school/branch with this email already exists' });
            }
        }

        const schoolId = await generateSchoolId(School);
        const plainPassword = generateSchoolPassword();

        // Use parent's logo if none provided
        const logo = req.file ? req.file.location : currentSchool.logo;

        // Construct address
        const addressObj = {
            street: address || '',
            city: city || '',
            state: state || '',
            pincode: pincode || '',
            full: address ? `${address}${city ? ', ' + city : ''}${state ? ', ' + state : ''}${pincode ? ' - ' + pincode : ''}` : ''
        };

        const branch = await School.create({
            schoolId,
            name,
            email: email.toLowerCase(),
            address: addressObj,
            type: 'sub',
            parentId: currentSchool._id,
            contact: { phone, email },
            password: plainPassword,
            plainPassword: plainPassword,
            mustChangePassword: true,
            isDataVisibleToSchool: isDataVisibleToSchool === 'true' || isDataVisibleToSchool === true,
            logo: logo,
            assignedTests: currentSchool.assignedTests // Inherit tests? Or default? Using parent's tests for now
        });

        // Also create credentials entry
        await SchoolCredentials.create({
            schoolId: branch._id,
            email: email.toLowerCase(),
            password: plainPassword,
            role: 'school'
        });

        const { sendSchoolCredentialsEmail } = require('../utils/emailService');
        // Send email logic...
        let emailSent = false;
        if (sendEmail === 'true' || sendEmail === true) {
            const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
            emailSent = await sendSchoolCredentialsEmail(
                email.toLowerCase(),
                name,
                plainPassword,
                `${frontendUrl}/login`
            );
            if (emailSent) {
                branch.credentialsEmailSent = true;
                branch.lastCredentialsEmailSentAt = new Date();
                await branch.save();
            }
        }

        res.status(201).json({
            _id: branch._id,
            schoolId: branch.schoolId,
            email: branch.email,
            name: branch.name,
            type: branch.type,
            parentId: branch.parentId,
            message: 'Branch created successfully'
        });

    } catch (error) {
        console.error('Create branch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/school/branches/:id
// @desc    Update branch details
// @access  School Admin (Super School only)
router.put('/branches/:id', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { name, address, city, state, pincode, phone, email, isDataVisibleToSchool, password } = req.body;

        const branch = await School.findOne({
            _id: req.params.id,
            parentId: req.school._id // Ensure it belongs to this super school
        });

        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        // Update fields
        if (name) branch.name = name;
        if (phone) branch.contact.phone = phone;
        if (email) {
            branch.email = email.toLowerCase();
            branch.contact.email = email.toLowerCase();
        }
        if (isDataVisibleToSchool !== undefined) {
            branch.isDataVisibleToSchool = isDataVisibleToSchool === 'true' || isDataVisibleToSchool === true;
        }

        // Update address if provided
        if (address || city || state || pincode) {
            branch.address = {
                street: address || branch.address.street,
                city: city || branch.address.city,
                state: state || branch.address.state,
                pincode: pincode || branch.address.pincode,
                full: `${address || branch.address.street}${city || branch.address.city ? ', ' + (city || branch.address.city) : ''}${state || branch.address.state ? ', ' + (state || branch.address.state) : ''}`
            };
        }

        // Update password if provided
        if (password && password.trim().length > 0) {
            branch.password = password; // Will be hashed by pre-save hook
            branch.plainPassword = password;
            branch.mustChangePassword = true;

            // Also update credentials collection
            await SchoolCredentials.findOneAndUpdate(
                { schoolId: branch._id },
                { plainPassword: password }
            );
        }

        await branch.save();

        res.json({
            message: 'Branch updated successfully',
            branch: {
                _id: branch._id,
                name: branch.name,
                email: branch.email,
                address: branch.address
            }
        });
    } catch (error) {
        console.error('Update branch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/school/branches/:id
// @desc    Delete a branch
// @access  School Admin (Super School only)
router.delete('/branches/:id', protect, isSchoolAdmin, async (req, res) => {
    try {
        const branch = await School.findOne({
            _id: req.params.id,
            parentId: req.school._id // Ensure it belongs to this super school
        });

        if (!branch) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        // Delete the branch
        await School.findByIdAndDelete(req.params.id);

        // Delete associated credentials
        await SchoolCredentials.deleteMany({ schoolId: req.params.id });

        // Optional: Logic to handle students/data associated with this branch could go here
        // For now, we assume simple soft/hard delete of the school entity is enough

        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        console.error('Delete branch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/dashboard
// @desc    Get school dashboard overview
// @access  School Admin
router.get('/dashboard', protect, isSchoolAdmin, async (req, res) => {
    try {
        const schoolId = req.school._id;

        let query = { isActive: true };
        let submissionQuery = { status: 'complete' };

        if (req.school.type === 'super') {
            query.$or = [
                { schoolId: req.school._id },
                { parentId: req.school._id }
            ];
            // submissionQuery needs to filter by schoolId/parentId implicitly via studentId or explicit schoolId check
            // Simpler: Find matching students first, then count their submissions
            // OR use schoolId in Submission if available. 
            // We'll rely on schoolId in Submission for efficiency if indexed, but to be consistent with student query:
            submissionQuery.$or = [
                { schoolId: req.school._id },
                { schoolId: { $in: await School.find({ parentId: req.school._id }).distinct('_id') } }
            ];
            // Optimisation: simpler to just find students matching the query, then count their complete submissions
            // But counting documents is faster. Let's use the explicit ID list for submissions to match logic.
            const branches = await School.find({ parentId: req.school._id }).distinct('_id');
            const allSchoolIds = [req.school._id, ...branches];

            submissionQuery = { schoolId: { $in: allSchoolIds }, status: 'complete' };
            // Reset student query to use same list for consistency
            query = { schoolId: { $in: allSchoolIds }, isActive: true };

        } else {
            query.schoolId = req.school._id;
            submissionQuery.schoolId = req.school._id;
        }

        const [studentCount, completedCount] = await Promise.all([
            Student.countDocuments(query),
            // Count unique students who have completed submissions (status='complete')
            Submission.distinct('studentId', submissionQuery).then(arr => arr.length)
        ]);

        // Get class breakdown
        const classStats = await Student.aggregate([
            { $match: query },
            { $group: { _id: { class: '$class', section: '$section' }, count: { $sum: 1 } } },
            { $sort: { '_id.class': 1, '_id.section': 1 } }
        ]);

        const school = await School.findById(schoolId)
            .populate('assignedTests', 'title isDefault questionCount')
            .populate('parentId', 'name schoolId');

        // Ensure pending is never negative
        const pendingTests = Math.max(0, studentCount - completedCount);

        res.json({
            school: {
                name: school.name,
                logo: school.logo,
                schoolId: school.schoolId,
                type: school.type,
                parentId: school.parentId,
                address: school.address
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
        const { class: className, section, status, page: pageParam, limit: limitParam, schoolId } = req.query;
        const page = parseInt(pageParam) || 1;
        const limit = parseInt(limitParam) || 20;
        const skip = (page - 1) * limit;

        let query = { isActive: true };

        // simplified aggregation logic:
        if (schoolId) {
            // Specific branch filter requested
            const targetSchool = await School.findOne({ _id: schoolId });
            // Validate access
            const isSelf = schoolId === req.school._id.toString();
            const isChild = targetSchool && targetSchool.parentId && targetSchool.parentId.toString() === req.school._id.toString();

            if (!isSelf && !isChild) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
            query.schoolId = schoolId;
        } else if (req.school.type === 'super') {
            // Default Super School: Show own students OR students from branches
            query.$or = [
                { schoolId: req.school._id },
                { parentId: req.school._id }
            ];
        } else {
            // Sub school: Only own students
            query.schoolId = req.school._id;
        }

        if (className) query.class = className;
        if (section) query.section = section;

        // Get total count for this query
        let total = await Student.countDocuments(query);

        let students = await Student.find(query)
            .populate('schoolId', 'name')
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
            parentId: req.school.type === 'sub' ? req.school.parentId : null, // Link to parent if sub-school
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
                parentId: req.school.type === 'sub' ? req.school.parentId : null, // Link to parent if sub-school
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
// @desc    Archive and Hard delete student
// @access  School Admin
router.delete('/students/:id', protect, isSchoolAdmin, async (req, res) => {
    let session = null;
    try {
        const mongoose = require('mongoose');
        session = await mongoose.startSession();
        session.startTransaction();

        const student = await Student.findOne({
            _id: req.params.id,
            schoolId: req.school._id
        }).session(session);

        if (!student) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get student's submissions for archival
        const submissions = await Submission.find({ studentId: student._id })
            .populate('assessmentId', 'title')
            .session(session);

        // Archive student data before deletion
        await ArchivedData.create([{
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
                assessmentTitle: sub.assessmentId?.title || 'Unknown Assessment',
                totalScore: sub.totalScore,
                sectionScores: sub.sectionScores,
                assignedBucket: sub.assignedBucket,
                submittedAt: sub.submittedAt,
                answers: sub.answers
            })),
            stats: {
                submissionCount: submissions.length
            }
        }], { session });

        // Delete associated submissions
        await Submission.deleteMany({ studentId: student._id }).session(session);

        // Hard delete the student
        await Student.findByIdAndDelete(req.params.id).session(session);

        await session.commitTransaction();
        session.endSession();

        res.json({ message: 'Student archived and permanently deleted successfully' });
    } catch (error) {
        console.error('Delete student error:', error);
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
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
            { $match: { schoolId: req.query.schoolId ? new mongoose.Types.ObjectId(req.query.schoolId) : req.school._id, isActive: true } },
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

        let query = { isActive: true };

        // simplified aggregation logic:
        if (req.school.type === 'super') {
            query.$or = [
                { schoolId: req.school._id },
                { parentId: req.school._id }
            ];
        } else {
            query.schoolId = req.school._id;
        }

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

        // Determine target school ID (Same logic as above, but simplified for repeated use context)
        let schoolName = req.school.name;
        let studentQuery = { isActive: true };

        if (req.query.schoolId) {
            // Specific branch view
            const targetSchool = await School.findOne({ _id: req.query.schoolId });

            // Security check: Must be self, or a child branch
            const isSelf = req.query.schoolId === req.school._id.toString();
            const isChild = targetSchool && targetSchool.parentId && targetSchool.parentId.toString() === req.school._id.toString();

            if (!isSelf && !isChild) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            studentQuery.schoolId = req.query.schoolId;
            if (targetSchool) schoolName = targetSchool.name;

            studentQuery.schoolId = req.query.schoolId;
            if (targetSchool) schoolName = targetSchool.name;

        } else if (req.school.type === 'super') {
            // Aggregate View: Own students OR Branch students (Default for Super School)
            studentQuery.$or = [
                { schoolId: req.school._id },
                { parentId: req.school._id }
            ];
            schoolName = `${req.school.name} & Branches`;
        } else {
            // Standard View: Only own students
            studentQuery.schoolId = req.school._id;
        }

        if (className) studentQuery.class = className;
        if (section) studentQuery.section = section;

        // Get filtered student IDs
        const filteredStudents = await Student.find(studentQuery).select('_id');
        const studentIds = filteredStudents.map(s => s._id);

        // Get submissions for filtered students (only complete ones for analytics)
        // Note: We can rely on studentId filtering here since we already filtered students based on school/parent logic
        const submissions = await Submission.find({
            studentId: { $in: studentIds },
            status: 'complete'  // Only include complete submissions in analytics
        })
            .populate('studentId', 'name accessId class section')
            .populate('schoolId', 'name') // Populate school name for aggregation view
            .sort({ submittedAt: -1 });

        const analytics = calculateAnalytics(submissions);

        res.json({
            ...analytics,
            recentSubmissions: submissions.slice(0, 20),
            filters: { class: className || null, section: section || null },
            aggregated: req.school.type === 'super' && !req.query.schoolId, // Updated logic: true if super school and no specific school filter
            schoolName
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

        let targetSchoolId = req.school._id;
        let isAggregated = false;

        if (req.query.schoolId) {
            // Specific branch filter
            const targetSchool = await School.findOne({ _id: req.query.schoolId });

            // Validate access
            const isSelf = req.query.schoolId === req.school._id.toString();
            const isChild = targetSchool && targetSchool.parentId && targetSchool.parentId.toString() === req.school._id.toString();

            if (!isSelf && !isChild) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
            targetSchoolId = req.query.schoolId;
        } else if (req.school.type === 'super') {
            // Default to aggregated view for Super School
            isAggregated = true;
        }

        // Build student query
        let studentQuery = { isActive: true };

        if (isAggregated) {
            studentQuery.$or = [
                { schoolId: req.school._id },
                { parentId: req.school._id }
            ];
        } else {
            studentQuery.schoolId = targetSchoolId;
        }

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
        // Get submissions for these students
        // We only filter by studentId, because we've already filtered the students list according to the school/branch logic
        // and we want ALL submissions for these valid students.
        let submissionQuery = {
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
        const allStudents = await Student.find({ schoolId: targetSchoolId, isActive: true })
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
        // Allow access if own student OR (super school AND student belongs to child branch)
        const studentQuery = {
            _id: req.params.id,
            isActive: true
        };

        if (req.school.type === 'super') {
            studentQuery.$or = [
                { schoolId: req.school._id },
                { parentId: req.school._id }
            ];
        } else {
            studentQuery.schoolId = req.school._id;
        }

        const student = await Student.findOne(studentQuery);

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
