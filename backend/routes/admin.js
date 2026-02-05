const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const School = require('../models/School');
const Assessment = require('../models/Assessment');
const Student = require('../models/Student');
const Submission = require('../models/Submission');
const ArchivedData = require('../models/ArchivedData');
const SchoolCredentials = require('../models/SchoolCredentials');
const { protect, isAdmin, generateToken } = require('../middleware/auth');
const { generateSchoolId, generateSchoolPassword } = require('../utils/idGenerator');
const { exportSubmissionsToExcel, calculateAnalytics } = require('../utils/exportData');
const { logoUpload, deleteFromS3 } = require('../utils/s3Upload');
const { sendSchoolCredentialsEmail, sendPasswordChangedEmail } = require('../utils/emailService');

// Use S3 upload for logos
const upload = logoUpload;

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin by email
        const admin = await Admin.findOne({ email: email.toLowerCase() });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await admin.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last login
        admin.lastLogin = new Date();
        await admin.save();

        res.json({
            _id: admin._id,
            email: admin.email,
            name: admin.name,
            role: 'admin',
            token: generateToken(admin._id, 'admin')
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/change-password
// @desc    Change admin's own password
// @access  Admin
router.put('/change-password', protect, isAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const admin = await Admin.findById(req.user._id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Verify current password
        const isMatch = await admin.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Update password
        admin.password = newPassword;
        await admin.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/profile
// @desc    Update admin's own profile (name, email)
// @access  Admin
router.put('/profile', protect, isAdmin, async (req, res) => {
    try {
        const { name, email } = req.body;

        const admin = await Admin.findById(req.user._id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Check if new email is unique
        if (email && email.toLowerCase() !== admin.email) {
            const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
            if (existingAdmin) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            admin.email = email.toLowerCase();
        }

        if (name) {
            admin.name = name;
        }

        await admin.save();

        res.json({
            _id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/admins
// @desc    Get all admin accounts (with pagination)
// @access  Admin
router.get('/admins', protect, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [admins, total] = await Promise.all([
            Admin.find()
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Admin.countDocuments()
        ]);

        res.json({
            data: admins,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/admins
// @desc    Create new admin account
// @access  Admin
router.post('/admins', protect, isAdmin, async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        // Check if email already exists
        const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin with this email already exists' });
        }

        const admin = await Admin.create({
            email: email.toLowerCase(),
            password,
            name: name || 'Company Admin',
            role: role || 'admin'
        });

        res.status(201).json({
            _id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            createdAt: admin.createdAt,
            message: 'Admin created successfully'
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/admins/:id
// @desc    Update an admin account
// @access  Admin
router.put('/admins/:id', protect, isAdmin, async (req, res) => {
    try {
        const { email, name, role, password } = req.body;

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Check if new email is unique
        if (email && email.toLowerCase() !== admin.email) {
            const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
            if (existingAdmin) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            admin.email = email.toLowerCase();
        }

        if (name) admin.name = name;
        if (role) admin.role = role;
        if (password && password.length >= 6) {
            admin.password = password;
        }

        await admin.save();

        res.json({
            _id: admin._id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            createdAt: admin.createdAt,
            lastLogin: admin.lastLogin,
            message: 'Admin updated successfully'
        });
    } catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/admins/:id
// @desc    Delete an admin account
// @access  Admin
router.delete('/admins/:id', protect, isAdmin, async (req, res) => {
    try {
        // Prevent self-deletion
        if (req.params.id === req.user.id.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        const admin = await Admin.findById(req.params.id);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        // Prevent deleting the last admin
        const adminCount = await Admin.countDocuments();
        if (adminCount <= 1) {
            return res.status(400).json({ message: 'Cannot delete the last admin account' });
        }

        await Admin.findByIdAndDelete(req.params.id);

        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/dashboard
// @desc    Get dashboard overview data
// @access  Admin
router.get('/dashboard', protect, isAdmin, async (req, res) => {
    try {
        const [schoolCount, studentCount, assessmentCount, submissions] = await Promise.all([
            School.countDocuments({ isActive: true }),
            Student.countDocuments({ isActive: true }),
            Assessment.countDocuments({ isActive: true }),
            Submission.find().sort({ submittedAt: -1 }).limit(100)
        ]);

        const analytics = calculateAnalytics(submissions);

        // Get recent schools
        const recentSchools = await School.find({ isActive: true })
            .select('name schoolId logo createdAt')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            overview: {
                totalSchools: schoolCount,
                totalStudents: studentCount,
                totalAssessments: assessmentCount,
                totalSubmissions: submissions.length
            },
            analytics,
            recentSchools
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/schools
// @desc    Get all schools (with pagination)
// @access  Admin
router.get('/schools', protect, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const skip = (page - 1) * limit;

        // Build search query
        const query = { isActive: true };
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { schoolId: searchRegex },
                { email: searchRegex }
            ];
        }

        // Get total count first
        const total = await School.countDocuments(query);

        const schools = await School.find(query)
            .populate('assignedTests', 'title isDefault')
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        // Get student count per school
        const schoolsWithStats = await Promise.all(
            schools.map(async (school) => {
                const studentCount = await Student.countDocuments({
                    schoolId: school._id,
                    isActive: true
                });
                const submissionCount = await Submission.countDocuments({
                    schoolId: school._id
                });
                return {
                    ...school.toObject(),
                    studentCount,
                    submissionCount
                };
            })
        );

        res.json({
            data: schoolsWithStats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get schools error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/schools
// @desc    Register a new school (with email for login)
// @access  Admin
router.post('/schools', protect, isAdmin, upload.single('logo'), async (req, res) => {
    try {
        const { name, address, phone, email, isDataVisibleToSchool, sendEmail } = req.body;

        // Validate email is required for new schools
        if (!email) {
            return res.status(400).json({ message: 'Email is required for school registration' });
        }

        // Check if email already exists
        const existingSchool = await School.findOne({ email: email.toLowerCase() });
        if (existingSchool) {
            return res.status(400).json({ message: 'A school with this email already exists' });
        }

        // Generate unique school ID and password
        const schoolId = await generateSchoolId(School);
        const plainPassword = generateSchoolPassword();

        // Get default assessment
        const defaultAssessment = await Assessment.findOne({ isDefault: true });

        // Determine login URL
        const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
        const loginUrl = `${frontendUrl}/login`;

        // Create school
        const school = await School.create({
            schoolId,
            name,
            email: email.toLowerCase(),
            address,
            contact: { phone, email },
            password: plainPassword,
            plainPassword: plainPassword,
            mustChangePassword: true,
            isDataVisibleToSchool: isDataVisibleToSchool === 'true' || isDataVisibleToSchool === true,
            logo: req.file ? req.file.location : '',
            assignedTests: defaultAssessment ? [defaultAssessment._id] : []
        });

        // Store credentials in separate collection for tracking
        await SchoolCredentials.create({
            schoolId: school._id,
            email: email.toLowerCase(),
            schoolName: name,
            plainPassword: plainPassword
        });

        // Send credentials email if requested
        let emailSent = false;
        if (sendEmail === 'true' || sendEmail === true) {
            emailSent = await sendSchoolCredentialsEmail(
                email.toLowerCase(),
                name,
                plainPassword,
                loginUrl
            );
            if (emailSent) {
                school.credentialsEmailSent = true;
                school.lastCredentialsEmailSentAt = new Date();
                await school.save();
            }
        }

        res.status(201).json({
            _id: school._id,
            schoolId: school.schoolId,
            email: school.email,
            name: school.name,
            password: plainPassword,
            plainPassword: plainPassword,
            logo: school.logo,
            address: school.address,
            contact: school.contact,
            isDataVisibleToSchool: school.isDataVisibleToSchool,
            isBlocked: school.isBlocked,
            assignedTests: school.assignedTests,
            credentialsEmailSent: emailSent,
            message: emailSent
                ? 'School registered successfully. Credentials email sent!'
                : 'School registered successfully. Save the credentials!'
        });
    } catch (error) {
        console.error('Create school error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/schools/:id/send-credentials
// @desc    Send or resend credentials email to school
// @access  Admin
router.post('/schools/:id/send-credentials', protect, isAdmin, async (req, res) => {
    try {
        const { regeneratePassword } = req.body;

        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        if (!school.email) {
            return res.status(400).json({ message: 'School does not have an email configured' });
        }

        let password = school.plainPassword;

        // Regenerate password if requested
        if (regeneratePassword === 'true' || regeneratePassword === true) {
            password = generateSchoolPassword();
            school.password = password;
            school.plainPassword = password;
            school.mustChangePassword = true;

            // Update credentials collection
            await SchoolCredentials.updatePassword(school._id, password);
        }

        // Determine login URL
        const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
        const loginUrl = `${frontendUrl}/login`;

        // Send email
        const emailSent = await sendSchoolCredentialsEmail(
            school.email,
            school.name,
            password,
            loginUrl
        );

        if (emailSent) {
            school.credentialsEmailSent = true;
            school.lastCredentialsEmailSentAt = new Date();
            await school.save();

            res.json({
                success: true,
                message: 'Credentials email sent successfully',
                passwordRegenerated: regeneratePassword === 'true' || regeneratePassword === true
            });
        } else {
            res.status(500).json({ message: 'Failed to send credentials email' });
        }
    } catch (error) {
        console.error('Send credentials error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
// @desc    Update school
// @access  Admin
router.put('/schools/:id', protect, isAdmin, upload.single('logo'), async (req, res) => {
    try {
        const { name, address, phone, email, isDataVisibleToSchool, resetPassword } = req.body;

        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        school.name = name || school.name;
        school.address = address || school.address;
        school.contact = {
            phone: phone || school.contact?.phone,
            email: email || school.contact?.email
        };
        school.isDataVisibleToSchool = isDataVisibleToSchool === 'true' || isDataVisibleToSchool === true;

        if (req.file) {
            // Delete old logo from S3 if exists
            if (school.logo && school.logo.includes('amazonaws.com')) {
                deleteFromS3(school.logo);
            }
            school.logo = req.file.location;
        }

        let newPassword = null;
        if (resetPassword === 'true' || resetPassword === true) {
            newPassword = generateSchoolPassword();
            school.password = newPassword;
        }

        await school.save();

        const response = {
            _id: school._id,
            schoolId: school.schoolId,
            name: school.name,
            logo: school.logo,
            address: school.address,
            contact: school.contact,
            isDataVisibleToSchool: school.isDataVisibleToSchool
        };

        if (newPassword) {
            response.newPassword = newPassword;
        }

        res.json(response);
    } catch (error) {
        console.error('Update school error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/schools/:id
// @desc    Archive and soft delete school (archives all school data, students, submissions)
// @access  Admin
router.delete('/schools/:id', protect, isAdmin, async (req, res) => {
    try {
        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        // Get all students of this school
        const students = await Student.find({ schoolId: school._id });
        const studentIds = students.map(s => s._id);

        // Get all submissions for this school
        const submissions = await Submission.find({ schoolId: school._id })
            .populate('assessmentId', 'title')
            .populate('studentId', 'name');

        // Create archive document with all school data
        await ArchivedData.create({
            type: 'school',
            archivedBy: 'admin',
            reason: 'manual_deletion',
            schoolData: {
                _id: school._id,
                schoolId: school.schoolId,
                name: school.name,
                logo: school.logo,
                address: school.address,
                contact: school.contact,
                isDataVisibleToSchool: school.isDataVisibleToSchool,
                assignedTests: school.assignedTests,
                createdAt: school.createdAt
            },
            schoolStudents: students.map(s => ({
                _id: s._id,
                accessId: s.accessId,
                name: s.name,
                rollNo: s.rollNo,
                class: s.class,
                section: s.section,
                testStatus: s.testStatus,
                createdAt: s.createdAt
            })),
            schoolSubmissions: submissions.map(sub => ({
                studentId: sub.studentId?._id,
                studentName: sub.studentId?.name,
                assessmentId: sub.assessmentId?._id,
                assessmentTitle: sub.assessmentId?.title,
                totalScore: sub.totalScore,
                sectionScores: sub.sectionScores,
                assignedBucket: sub.assignedBucket,
                submittedAt: sub.submittedAt,
                answers: sub.answers
            })),
            stats: {
                studentCount: students.length,
                submissionCount: submissions.length
            }
        });

        // Soft delete school and students
        school.isActive = false;
        await school.save();
        await Student.updateMany({ schoolId: school._id }, { isActive: false });

        res.json({
            message: 'School archived and deleted successfully',
            archived: {
                students: students.length,
                submissions: submissions.length
            }
        });
    } catch (error) {
        console.error('Delete school error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/schools/:id/students-analytics
// @desc    Get all students of a school with their submission data
// @access  Admin
router.get('/schools/:id/students-analytics', protect, isAdmin, async (req, res) => {
    try {
        const { class: className, section, assessmentId, search } = req.query;

        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        // Build student query
        let studentQuery = { schoolId: school._id, isActive: true };
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
            .select('name accessId class section rollNo testStatus')
            .sort({ class: 1, section: 1, name: 1 });

        // Get submissions for these students
        let submissionQuery = {
            schoolId: school._id,
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

        // Build response with student data and submissions
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

        // Get unique classes and sections for filters
        const allStudents = await Student.find({ schoolId: school._id, isActive: true })
            .select('class section');
        const uniqueClasses = [...new Set(allStudents.map(s => s.class))].sort();
        const uniqueSections = className
            ? [...new Set(allStudents.filter(s => s.class === className).map(s => s.section))].sort()
            : [];

        // Get assessments for filter
        const assessments = await Assessment.find({ isActive: true })
            .select('title');

        res.json({
            school: { _id: school._id, name: school.name, schoolId: school.schoolId },
            students: studentsWithAnalytics,
            totalStudents: studentsWithAnalytics.length,
            filters: {
                classes: uniqueClasses,
                sections: uniqueSections,
                assessments: assessments
            }
        });
    } catch (error) {
        console.error('Get school students analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   GET /api/admin/assessments
// @desc    Get all assessments
// @access  Admin
router.get('/assessments', protect, isAdmin, async (req, res) => {
    try {
        const assessments = await Assessment.find({ isActive: true })
            .select('title description isDefault inactivityAlertTime inactivityEndTime questions buckets customSections createdAt')
            .sort({ isDefault: -1, createdAt: -1 });

        const assessmentsWithStats = assessments.map(a => ({
            ...a.toObject(),
            questionCount: a.questions?.length || 0
        }));

        res.json(assessmentsWithStats);
    } catch (error) {
        console.error('Get assessments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/assessments
// @desc    Create new assessment
// @access  Admin
router.post('/assessments', protect, isAdmin, async (req, res) => {
    try {
        const { title, description, inactivityAlertTime, inactivityEndTime, questions, buckets, customSections } = req.body;

        const assessment = await Assessment.create({
            title,
            description,
            inactivityAlertTime: inactivityAlertTime || 40,
            inactivityEndTime: inactivityEndTime || 120,
            questions,
            buckets,
            customSections: customSections || [],
            isDefault: false
        });

        res.status(201).json(assessment);
    } catch (error) {
        console.error('Create assessment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/assessments/:id
// @desc    Update assessment
// @access  Admin
router.put('/assessments/:id', protect, isAdmin, async (req, res) => {
    try {
        const { title, description, inactivityAlertTime, inactivityEndTime, questions, buckets, customSections } = req.body;

        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        assessment.title = title || assessment.title;
        assessment.description = description || assessment.description;
        assessment.inactivityAlertTime = inactivityAlertTime || assessment.inactivityAlertTime;
        assessment.inactivityEndTime = inactivityEndTime || assessment.inactivityEndTime;

        if (questions) assessment.questions = questions;
        if (buckets) assessment.buckets = buckets;
        if (customSections) assessment.customSections = customSections;

        await assessment.save();

        res.json(assessment);
    } catch (error) {
        console.error('Update assessment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/assessments/:id
// @desc    Delete assessment (soft delete or hard delete if no submissions)
// @access  Admin
router.delete('/assessments/:id', protect, isAdmin, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Check if this is the default assessment
        if (assessment.isDefault) {
            return res.status(400).json({ message: 'Cannot delete the default assessment' });
        }

        // Check if there are any submissions for this assessment
        const submissionCount = await Submission.countDocuments({ assessmentId: assessment._id });

        if (submissionCount > 0) {
            // Soft delete - just mark as inactive
            assessment.isActive = false;
            await assessment.save();
            res.json({ message: 'Assessment deactivated (has existing submissions)' });
        } else {
            // Hard delete - no submissions exist
            await Assessment.findByIdAndDelete(req.params.id);
            res.json({ message: 'Assessment deleted successfully' });
        }
    } catch (error) {
        console.error('Delete assessment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/analytics
// @desc    Get analytics with filters
// @access  Admin
router.get('/analytics', protect, isAdmin, async (req, res) => {
    try {
        const { schoolId, startDate, endDate, bucket, className } = req.query;

        let query = {};

        if (schoolId) {
            query.schoolId = schoolId;
        }

        if (startDate || endDate) {
            query.submittedAt = {};
            if (startDate) query.submittedAt.$gte = new Date(startDate);
            if (endDate) query.submittedAt.$lte = new Date(endDate);
        }

        if (bucket) {
            query.assignedBucket = bucket;
        }

        const submissions = await Submission.find(query)
            .populate('studentId', 'name accessId class section')
            .populate('schoolId', 'name schoolId')
            .sort({ submittedAt: -1 });

        // Filter by class if specified
        let filteredSubmissions = submissions;
        if (className) {
            filteredSubmissions = submissions.filter(s => s.studentId?.class === className);
        }

        const analytics = calculateAnalytics(filteredSubmissions);

        // Get per-school breakdown
        const schoolBreakdown = {};
        filteredSubmissions.forEach(sub => {
            const schoolName = sub.schoolId?.name || 'Unknown';
            if (!schoolBreakdown[schoolName]) {
                schoolBreakdown[schoolName] = {
                    total: 0,
                    buckets: {}
                };
            }
            schoolBreakdown[schoolName].total++;
            const b = sub.assignedBucket || 'Unknown';
            schoolBreakdown[schoolName].buckets[b] = (schoolBreakdown[schoolName].buckets[b] || 0) + 1;
        });

        // Get per-class breakdown
        const classBreakdown = {};
        filteredSubmissions.forEach(sub => {
            const classKey = sub.studentId?.class || 'Unknown';
            if (!classBreakdown[classKey]) {
                classBreakdown[classKey] = {
                    total: 0,
                    avgScore: 0,
                    totalScore: 0,
                    buckets: {}
                };
            }
            classBreakdown[classKey].total++;
            classBreakdown[classKey].totalScore += sub.totalScore || 0;
            const b = sub.assignedBucket || 'Unknown';
            classBreakdown[classKey].buckets[b] = (classBreakdown[classKey].buckets[b] || 0) + 1;
        });

        // Calculate avg scores per class
        Object.keys(classBreakdown).forEach(cls => {
            classBreakdown[cls].avgScore = classBreakdown[cls].total > 0
                ? Math.round(classBreakdown[cls].totalScore / classBreakdown[cls].total * 10) / 10
                : 0;
        });

        res.json({
            ...analytics,
            schoolBreakdown,
            classBreakdown,
            recentSubmissions: filteredSubmissions.slice(0, 20),
            filters: {
                schoolId: schoolId || null,
                className: className || null,
                bucket: bucket || null
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/export
// @desc    Export data to Excel
// @access  Admin
router.get('/export', protect, isAdmin, async (req, res) => {
    try {
        const { schoolId, startDate, endDate, bucket } = req.query;

        let query = {};

        if (schoolId) query.schoolId = schoolId;
        if (startDate || endDate) {
            query.submittedAt = {};
            if (startDate) query.submittedAt.$gte = new Date(startDate);
            if (endDate) query.submittedAt.$lte = new Date(endDate);
        }
        if (bucket) query.assignedBucket = bucket;

        const submissions = await Submission.find(query)
            .populate('studentId', 'name accessId class section rollNo')
            .populate('schoolId', 'name schoolId')
            .sort({ submittedAt: -1 });

        const workbook = await exportSubmissionsToExcel(submissions);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=jaagrmind-export.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/schools/:id/assign-test
// @desc    Assign test to school
// @access  Admin
router.post('/schools/:id/assign-test', protect, isAdmin, async (req, res) => {
    try {
        const { assessmentId } = req.body;

        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        if (!school.assignedTests.includes(assessmentId)) {
            school.assignedTests.push(assessmentId);
            await school.save();
        }

        res.json({ message: 'Test assigned successfully' });
    } catch (error) {
        console.error('Assign test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/schools/:id/tests
// @desc    Update all assigned tests for a school (bulk assignment)
// @access  Admin
router.put('/schools/:id/tests', protect, isAdmin, async (req, res) => {
    try {
        const { assignedTests, assignAll } = req.body;

        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        if (assignAll) {
            // Assign all active assessments
            const allAssessments = await Assessment.find({ isActive: true }).select('_id');
            school.assignedTests = allAssessments.map(a => a._id);
        } else if (assignedTests) {
            // Validate that all assessment IDs are valid
            const validAssessments = await Assessment.find({
                _id: { $in: assignedTests },
                isActive: true
            }).select('_id');
            school.assignedTests = validAssessments.map(a => a._id);
        }

        await school.save();

        const updatedSchool = await School.findById(req.params.id)
            .populate('assignedTests', 'title isDefault');

        res.json({
            message: 'Tests updated successfully',
            assignedTests: updatedSchool.assignedTests
        });
    } catch (error) {
        console.error('Update tests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/schools/:id/tests/:testId
// @desc    Remove a test from school
// @access  Admin
router.delete('/schools/:id/tests/:testId', protect, isAdmin, async (req, res) => {
    try {
        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        school.assignedTests = school.assignedTests.filter(
            t => t.toString() !== req.params.testId
        );
        await school.save();

        res.json({ message: 'Test removed from school' });
    } catch (error) {
        console.error('Remove test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/assessments/:id/set-default
// @desc    Set an assessment as the default
// @access  Admin
router.put('/assessments/:id/set-default', protect, isAdmin, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.id);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (!assessment.isActive) {
            return res.status(400).json({ message: 'Cannot set inactive assessment as default' });
        }

        // Unset current default
        await Assessment.updateMany(
            { isDefault: true },
            { isDefault: false }
        );

        // Set new default
        assessment.isDefault = true;
        await assessment.save();

        // Optionally: Add this assessment to all schools that don't have it
        const schools = await School.find({ isActive: true });
        for (const school of schools) {
            if (!school.assignedTests.includes(assessment._id)) {
                school.assignedTests.push(assessment._id);
                await school.save();
            }
        }

        res.json({
            message: 'Assessment set as default',
            assessment: {
                _id: assessment._id,
                title: assessment.title,
                isDefault: assessment.isDefault
            }
        });
    } catch (error) {
        console.error('Set default error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/schools/:id/credentials
// @desc    Update school ID and/or password
// @access  Admin
router.put('/schools/:id/credentials', protect, isAdmin, async (req, res) => {
    try {
        const { schoolId, password } = req.body;
        const school = await School.findById(req.params.id);

        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        // Check if new schoolId is unique (if changing)
        if (schoolId && schoolId !== school.schoolId) {
            const existing = await School.findOne({ schoolId });
            if (existing) {
                return res.status(400).json({ message: 'School ID already in use' });
            }
            school.schoolId = schoolId;
        }

        // Update password if provided
        if (password) {
            school.password = password;
            school.plainPassword = password;
        }

        await school.save();

        res.json({
            message: 'Credentials updated',
            schoolId: school.schoolId,
            plainPassword: school.plainPassword
        });
    } catch (error) {
        console.error('Update credentials error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/schools/:id/block
// @desc    Block or unblock a school
// @access  Admin
router.put('/schools/:id/block', protect, isAdmin, async (req, res) => {
    try {
        const { isBlocked } = req.body;
        const school = await School.findById(req.params.id);

        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        school.isBlocked = isBlocked;
        await school.save();

        res.json({
            message: isBlocked ? 'School blocked' : 'School unblocked',
            isBlocked: school.isBlocked
        });
    } catch (error) {
        console.error('Block school error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/student/:id/details
// @desc    Get detailed student info with all submissions and answers
// @access  Admin
router.get('/student/:id/details', protect, isAdmin, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id)
            .populate('schoolId', 'name schoolId');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Section name helper
        const getSectionName = (code) => {
            const sections = {
                'A': 'Focus & Attention',
                'B': 'Self-Esteem & Inner Confidence',
                'C': 'Social Confidence & Interaction',
                'D': 'Digital Hygiene & Self-Control'
            };
            return sections[code] || code;
        };

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
                school: student.schoolId,
                createdAt: student.createdAt
            },
            submissions: detailedSubmissions,
            totalSubmissions: detailedSubmissions.length
        });
    } catch (error) {
        console.error('Admin student details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
