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

        // Calculate Wellness Trends (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const trendSubmissions = await Submission.aggregate([
            {
                $match: {
                    submittedAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$submittedAt" },
                        year: { $year: "$submittedAt" }
                    },
                    avgScore: { $avg: "$totalScore" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);

        const wellnessTrends = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        // Fill in missing months and format
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            const month = d.getMonth() + 1;
            const year = d.getFullYear();

            const found = trendSubmissions.find(t => t._id.month === month && t._id.year === year);
            wellnessTrends.push({
                name: monthNames[month - 1],
                score: found ? Math.round(found.avgScore * 10) / 10 : 0,
                count: found ? found.count : 0
            });
        }

        // Calculate Attention Needed (Schools with high % of 'red' bucket submissions)
        const attentionStats = await Submission.aggregate([
            {
                $lookup: {
                    from: 'schools',
                    localField: 'schoolId',
                    foreignField: '_id',
                    as: 'school'
                }
            },
            { $unwind: '$school' },
            { $match: { 'school.isActive': true } },
            {
                $group: {
                    _id: '$schoolId',
                    name: { $first: '$school.name' },
                    total: { $sum: 1 },
                    redCount: {
                        $sum: {
                            $cond: [{ $eq: ['$assignedBucket', 'red'] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    name: 1,
                    total: 1,
                    redCount: 1,
                    riskRatio: { $divide: ['$redCount', '$total'] }
                }
            },
            { $match: { total: { $gte: 5 } } }, // Only schools with at least 5 submissions
            { $sort: { riskRatio: -1 } },
            { $limit: 5 }
        ]);

        const attentionNeeded = attentionStats.map(s => ({
            id: s._id,
            name: s.name,
            riskScore: Math.round(s.riskRatio * 100),
            details: `${s.redCount}/${s.total} students need support`
        }));


        res.json({
            overview: {
                totalSchools: schoolCount,
                totalStudents: studentCount,
                totalAssessments: assessmentCount,
                totalSubmissions: submissions.length
            },
            analytics,
            analytics,
            wellnessTrends,
            attentionNeeded
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
            .populate('branches') // Populate sub-schools
            .populate('parentId', 'name schoolId') // Populate parent info
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
        const { name, address, city, state, pincode, phone, email, type, parentId, isDataVisibleToSchool, sendEmail } = req.body;

        // Validate email is required for new schools
        if (!email) {
            return res.status(400).json({ message: 'Email is required for school registration' });
        }

        // Check if email already exists
        const existingSchool = await School.findOne({ email: email.toLowerCase() });
        if (existingSchool) {
            // Check if it's a "zombie" record (isActive: false)
            if (existingSchool.isActive === false) {
                console.log(`Found inactive school record for ${email}, cleaning up before registration...`);
                // Clean up the inactive record
                await School.findByIdAndDelete(existingSchool._id);
                // Also clean up credentials if they exist
                await SchoolCredentials.deleteMany({ schoolId: existingSchool._id });
            } else {
                return res.status(400).json({ message: 'A school with this email already exists' });
            }
        }

        // Generate unique school ID and password
        const schoolId = await generateSchoolId(School);
        const plainPassword = generateSchoolPassword();

        // Get default assessment
        const defaultAssessment = await Assessment.findOne({ isDefault: true });

        // Determine login URL
        const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
        const loginUrl = `${frontendUrl}/login`;

        // Construct address object
        const addressObj = {
            street: address || '',
            city: city || '',
            state: state || '',
            pincode: pincode || '',
            full: address ? `${address}${city ? ', ' + city : ''}${state ? ', ' + state : ''}${pincode ? ' - ' + pincode : ''}` : ''
        };

        // Create school
        const school = await School.create({
            schoolId,
            name,
            email: email.toLowerCase(),
            address: addressObj,
            type: type || 'super',
            parentId: parentId || null,
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
        const { name, address, city, state, pincode, phone, email, type, parentId, isDataVisibleToSchool, resetPassword } = req.body;

        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        school.name = name || school.name;

        // Ensure address object exists
        if (!school.address) {
            school.address = {};
        }

        // Update structured address
        if (address !== undefined) school.address.street = address;
        if (city !== undefined) school.address.city = city;
        if (state !== undefined) school.address.state = state;
        if (pincode !== undefined) school.address.pincode = pincode;

        // Update full address if any part changed or if it was empty
        if (address || city || state || pincode) {
            const street = school.address.street || '';
            const c = school.address.city || '';
            const s = school.address.state || '';
            const p = school.address.pincode || '';
            school.address.full = `${street}${c ? ', ' + c : ''}${s ? ', ' + s : ''}${p ? ' - ' + p : ''}`;
        } else if (address) {
            // Fallback if only address string was passed (legacy)
            school.address.full = address;
        }

        if (type) school.type = type;
        if (parentId) school.parentId = parentId;

        // Update contact info
        school.contact = {
            phone: phone || school.contact?.phone,
            email: email || school.contact?.email
        };

        // Update root email (login email) if changed, checking uniqueness
        if (email && email.toLowerCase() !== school.email) {
            const emailExists = await School.findOne({
                email: email.toLowerCase(),
                _id: { $ne: school._id }
            });
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use by another school' });
            }
            school.email = email.toLowerCase();
        }

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
            email: school.email, // Return updated email
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
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate field value entered' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: Object.values(error.errors).map(val => val.message).join(', ') });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ message: `Invalid ${error.path}: ${error.value}` });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/schools/:id
// @desc    Archive and hard delete school (archives all school data, students, submissions)
// @access  Admin
router.delete('/schools/:id', protect, isAdmin, async (req, res) => {
    let session = null;
    try {
        const mongoose = require('mongoose');
        session = await mongoose.startSession();
        session.startTransaction();

        const school = await School.findById(req.params.id).session(session);
        if (!school) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'School not found' });
        }

        // Get all students of this school
        const students = await Student.find({ schoolId: school._id }).session(session);

        // Get all submissions for this school
        const submissions = await Submission.find({ schoolId: school._id })
            .populate('assessmentId', 'title')
            .populate('studentId', 'name')
            .session(session);

        // Create archive document with all school data
        await ArchivedData.create([{
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
                studentName: sub.studentId?.name || (sub.studentId ? 'Unknown' : 'Deleted Student'),
                assessmentId: sub.assessmentId?._id,
                assessmentTitle: sub.assessmentId?.title || 'Unknown Assessment',
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
        }], { session });

        // Hard Data Clean up 
        // 1. Delete all students
        await Student.deleteMany({ schoolId: school._id }).session(session);

        // 2. Delete all submissions
        await Submission.deleteMany({ schoolId: school._id }).session(session);

        // 3. Delete school credentials (auth) - CRITICAL for re-creation
        await SchoolCredentials.deleteMany({ schoolId: school._id }).session(session);

        // 4. Delete tickets
        const Ticket = require('../models/Ticket');
        await Ticket.deleteMany({ school: school._id }).session(session);

        // 5. Delete the school itself
        await School.findByIdAndDelete(req.params.id).session(session);

        await session.commitTransaction();
        session.endSession();

        res.json({
            message: 'School archived and permanently deleted successfully',
            archived: {
                students: students.length,
                submissions: submissions.length
            }
        });
    } catch (error) {
        console.error('Delete school error:', error);
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }
        res.status(500).json({ message: 'Server error: ' + error.message });
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

// ============================================
// HIERARCHICAL ANALYTICS ENDPOINTS
// ============================================

// Helper function to get bucket category from score
const getBucketCategory = (score) => {
    if (score >= 8 && score <= 14) return 'green';  // Stable/Thriving
    if (score >= 15 && score <= 22) return 'yellow'; // Emerging/Growing
    if (score >= 23 && score <= 32) return 'red';    // Support Needed
    return 'unknown';
};

// Helper function to get overall bucket from total score
const getOverallBucket = (totalScore) => {
    if (totalScore >= 32 && totalScore <= 56) return 'doingWell';      // Stable
    if (totalScore >= 57 && totalScore <= 88) return 'needsSupport';   // Emerging
    if (totalScore >= 89 && totalScore <= 128) return 'needsAttention'; // Support Needed
    return 'unknown';
};

// @route   GET /api/admin/analytics/overview
// @desc    Get nationwide analytics overview for admin dashboard
// @access  Admin
router.get('/analytics/overview', protect, isAdmin, async (req, res) => {
    try {
        // Get counts
        const [totalSchools, totalStudents, totalSubmissions] = await Promise.all([
            School.countDocuments({ isActive: true }),
            Student.countDocuments({ isActive: true }),
            Submission.countDocuments({ status: 'complete' })
        ]);

        // Get all completed submissions for analytics
        const submissions = await Submission.find({ status: 'complete' })
            .select('schoolId totalScore sectionScores assignedBucket submittedAt')
            .sort({ submittedAt: -1 })
            .limit(5000);

        // Calculate skill distribution
        const skillDistribution = {
            A: { green: 0, yellow: 0, red: 0 }, B: { green: 0, yellow: 0, red: 0 },
            C: { green: 0, yellow: 0, red: 0 }, D: { green: 0, yellow: 0, red: 0 }
        };
        const overallDistribution = { doingWell: 0, needsSupport: 0, needsAttention: 0 };

        submissions.forEach(sub => {
            // Section-wise distribution
            if (sub.sectionScores) {
                Object.entries(sub.sectionScores).forEach(([section, score]) => {
                    if (skillDistribution[section]) {
                        const bucket = getBucketCategory(score);
                        if (bucket !== 'unknown') skillDistribution[section][bucket]++;
                    }
                });
            }
            // Overall distribution
            const overall = getOverallBucket(sub.totalScore);
            if (overall !== 'unknown') overallDistribution[overall]++;
        });

        // Get monthly trend data (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTrend = await Submission.aggregate([
            { $match: { status: 'complete', submittedAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$submittedAt' }, month: { $month: '$submittedAt' } },
                    count: { $sum: 1 },
                    avgScore: { $avg: '$totalScore' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Get top schools by submissions
        const topSchools = await Submission.aggregate([
            { $match: { status: 'complete' } },
            { $group: { _id: '$schoolId', count: { $sum: 1 }, avgScore: { $avg: '$totalScore' } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'schools', localField: '_id', foreignField: '_id', as: 'school' } },
            { $unwind: '$school' },
            {
                $project: {
                    schoolId: '$school._id',
                    name: '$school.name',
                    logo: '$school.logo',
                    submissionCount: '$count',
                    avgScore: { $round: ['$avgScore', 1] }
                }
            }
        ]);

        // Get all schools for the school list
        const schools = await School.find({ isActive: true })
            .select('name schoolId logo address createdAt')
            .sort({ name: 1 });

        // Get student and submission counts per school
        const schoolStats = await Promise.all(schools.map(async (school) => {
            const [studentCount, submissionCount] = await Promise.all([
                Student.countDocuments({ schoolId: school._id, isActive: true }),
                Submission.countDocuments({ schoolId: school._id, status: 'complete' })
            ]);
            return {
                _id: school._id,
                name: school.name,
                schoolId: school.schoolId,
                logo: school.logo,
                address: school.address,
                studentCount,
                submissionCount,
                completionRate: studentCount > 0 ? Math.round((submissionCount / studentCount) * 100) : 0
            };
        }));

        res.json({
            totals: { totalSchools, totalStudents, totalSubmissions },
            overallDistribution,
            skillDistribution,
            monthlyTrend: monthlyTrend.map(m => ({
                month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
                count: m.count,
                avgScore: Math.round(m.avgScore * 10) / 10
            })),
            topSchools,
            schools: schoolStats
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/analytics/tests
// @desc    Get all tests/assessments with submission statistics
// @access  Admin
router.get('/analytics/tests', protect, isAdmin, async (req, res) => {
    try {
        // Get all active assessments
        const assessments = await Assessment.find({ isActive: true })
            .select('title description createdAt')
            .sort({ createdAt: -1 });

        // Get submission stats for each assessment
        const testsWithStats = await Promise.all(assessments.map(async (assessment) => {
            const stats = await Submission.aggregate([
                { $match: { assessmentId: assessment._id } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        avgScore: { $avg: '$totalScore' }
                    }
                }
            ]);

            const completed = stats.find(s => s._id === 'complete') || { count: 0, avgScore: 0 };
            const pending = stats.find(s => s._id === 'pending') || { count: 0 };
            const incomplete = stats.find(s => s._id === 'incomplete') || { count: 0 };

            // Get bucket distribution for completed submissions
            const bucketDist = await Submission.aggregate([
                { $match: { assessmentId: assessment._id, status: 'complete' } },
                { $group: { _id: '$assignedBucket', count: { $sum: 1 } } }
            ]);

            const distribution = { doingWell: 0, needsSupport: 0, needsAttention: 0 };
            bucketDist.forEach(b => {
                if (b._id === 'Doing Well' || b._id === 'doingWell') distribution.doingWell = b.count;
                else if (b._id === 'Needs Support' || b._id === 'needsSupport') distribution.needsSupport = b.count;
                else if (b._id === 'Needs Attention' || b._id === 'needsAttention') distribution.needsAttention = b.count;
            });

            return {
                _id: assessment._id,
                title: assessment.title,
                description: assessment.description,
                createdAt: assessment.createdAt,
                totalSubmissions: completed.count + pending.count + incomplete.count,
                completedSubmissions: completed.count,
                pendingSubmissions: pending.count,
                incompleteSubmissions: incomplete.count,
                avgScore: Math.round((completed.avgScore || 0) * 10) / 10,
                completionRate: (completed.count + pending.count + incomplete.count) > 0
                    ? Math.round((completed.count / (completed.count + pending.count + incomplete.count)) * 100)
                    : 0,
                distribution
            };
        }));

        res.json({
            tests: testsWithStats,
            totalTests: testsWithStats.length
        });
    } catch (error) {
        console.error('Tests analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/analytics/tests/:testId
// @desc    Get detailed analytics for a specific test/assessment
// @access  Admin
router.get('/analytics/tests/:testId', protect, isAdmin, async (req, res) => {
    try {
        const assessment = await Assessment.findById(req.params.testId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Get all submissions for this test
        const submissions = await Submission.find({ assessmentId: assessment._id, status: 'complete' })
            .populate('studentId', 'name accessId class section')
            .populate('schoolId', 'name schoolId logo')
            .select('totalScore sectionScores assignedBucket submittedAt studentId schoolId');

        // Calculate overall stats
        const totalSubmissions = submissions.length;
        const avgScore = totalSubmissions > 0
            ? Math.round(submissions.reduce((acc, s) => acc + s.totalScore, 0) / totalSubmissions * 10) / 10
            : 0;

        // Bucket distribution
        const distribution = { doingWell: 0, needsSupport: 0, needsAttention: 0 };
        submissions.forEach(sub => {
            const bucket = getOverallBucket(sub.totalScore);
            if (bucket !== 'unknown') distribution[bucket]++;
        });

        // Skill distribution
        const skillDistribution = {
            A: { green: 0, yellow: 0, red: 0 },
            B: { green: 0, yellow: 0, red: 0 },
            C: { green: 0, yellow: 0, red: 0 },
            D: { green: 0, yellow: 0, red: 0 }
        };
        submissions.forEach(sub => {
            if (sub.sectionScores) {
                Object.entries(sub.sectionScores).forEach(([section, score]) => {
                    if (skillDistribution[section]) {
                        const bucket = getBucketCategory(score);
                        if (bucket !== 'unknown') skillDistribution[section][bucket]++;
                    }
                });
            }
        });

        // School-wise breakdown
        const schoolMap = {};
        submissions.forEach(sub => {
            if (sub.schoolId) {
                const schoolId = sub.schoolId._id.toString();
                if (!schoolMap[schoolId]) {
                    schoolMap[schoolId] = {
                        _id: sub.schoolId._id,
                        name: sub.schoolId.name,
                        schoolId: sub.schoolId.schoolId,
                        logo: sub.schoolId.logo,
                        submissions: 0,
                        totalScore: 0,
                        distribution: { doingWell: 0, needsSupport: 0, needsAttention: 0 }
                    };
                }
                schoolMap[schoolId].submissions++;
                schoolMap[schoolId].totalScore += sub.totalScore;
                const bucket = getOverallBucket(sub.totalScore);
                if (bucket !== 'unknown') schoolMap[schoolId].distribution[bucket]++;
            }
        });

        const schoolBreakdown = Object.values(schoolMap).map(school => ({
            ...school,
            avgScore: Math.round((school.totalScore / school.submissions) * 10) / 10
        })).sort((a, b) => b.submissions - a.submissions);

        // Recent submissions
        const recentSubmissions = submissions.slice(0, 10).map(sub => ({
            _id: sub._id,
            studentName: sub.studentId?.name || 'Unknown',
            studentClass: sub.studentId?.class || '-',
            schoolName: sub.schoolId?.name || 'Unknown',
            totalScore: sub.totalScore,
            bucket: sub.assignedBucket,
            submittedAt: sub.submittedAt
        }));

        res.json({
            assessment: {
                _id: assessment._id,
                title: assessment.title,
                description: assessment.description,
                questionCount: assessment.questions?.length || 0,
                createdAt: assessment.createdAt
            },
            stats: {
                totalSubmissions,
                avgScore,
                distribution,
                skillDistribution
            },
            schoolBreakdown,
            recentSubmissions
        });
    } catch (error) {
        console.error('Test analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/schools/:id/analytics
// @desc    Get school-level analytics with class breakdown
// @access  Admin
router.get('/schools/:id/analytics', protect, isAdmin, async (req, res) => {
    try {
        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        // Get all students and group by class
        const students = await Student.find({ schoolId: school._id, isActive: true })
            .select('name accessId class section rollNo');

        // Get all submissions for this school
        const submissions = await Submission.find({ schoolId: school._id, status: 'complete' })
            .populate('studentId', 'class section name')
            .select('studentId totalScore sectionScores assignedBucket submittedAt');

        // Group data by class
        const classMap = {};
        students.forEach(student => {
            const cls = student.class || 'Unknown';
            if (!classMap[cls]) {
                classMap[cls] = {
                    students: [],
                    submissions: [],
                    totalStudents: 0,
                    completedStudents: 0,
                    skillDistribution: {
                        A: { green: 0, yellow: 0, red: 0 }, B: { green: 0, yellow: 0, red: 0 },
                        C: { green: 0, yellow: 0, red: 0 }, D: { green: 0, yellow: 0, red: 0 }
                    },
                    overallDistribution: { doingWell: 0, needsSupport: 0, needsAttention: 0 }
                };
            }
            classMap[cls].students.push(student._id.toString());
            classMap[cls].totalStudents++;
        });

        // Assign submissions to classes and calculate distributions
        const completedStudentIds = new Set();
        submissions.forEach(sub => {
            if (!sub.studentId) return;
            const cls = sub.studentId.class || 'Unknown';
            if (classMap[cls]) {
                completedStudentIds.add(sub.studentId._id.toString());
                classMap[cls].submissions.push(sub);

                // Skill distribution
                if (sub.sectionScores) {
                    Object.entries(sub.sectionScores).forEach(([section, score]) => {
                        if (classMap[cls].skillDistribution[section]) {
                            const bucket = getBucketCategory(score);
                            if (bucket !== 'unknown') classMap[cls].skillDistribution[section][bucket]++;
                        }
                    });
                }
                // Overall distribution
                const overall = getOverallBucket(sub.totalScore);
                if (overall !== 'unknown') classMap[cls].overallDistribution[overall]++;
            }
        });

        // Update completed counts
        students.forEach(student => {
            const cls = student.class || 'Unknown';
            if (completedStudentIds.has(student._id.toString())) {
                classMap[cls].completedStudents++;
            }
        });

        // Convert to array and calculate stats
        const classes = Object.entries(classMap).map(([className, data]) => ({
            className,
            totalStudents: data.totalStudents,
            completedStudents: data.completedStudents,
            pendingStudents: data.totalStudents - data.completedStudents,
            completionRate: data.totalStudents > 0 ? Math.round((data.completedStudents / data.totalStudents) * 100) : 0,
            avgScore: data.submissions.length > 0
                ? Math.round(data.submissions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / data.submissions.length)
                : 0,
            skillDistribution: data.skillDistribution,
            overallDistribution: data.overallDistribution
        })).sort((a, b) => {
            // Sort classes naturally (1, 2, 3... not 1, 10, 11...)
            const aNum = parseInt(a.className) || 0;
            const bNum = parseInt(b.className) || 0;
            return aNum - bNum;
        });

        // Recent submissions
        const recentSubmissions = submissions
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
            .slice(0, 10)
            .map(sub => ({
                studentName: sub.studentId?.name || 'Unknown',
                class: sub.studentId?.class || 'Unknown',
                section: sub.studentId?.section || '',
                totalScore: sub.totalScore,
                bucket: sub.assignedBucket,
                submittedAt: sub.submittedAt
            }));

        // School overall stats
        const totalStudents = students.length;
        const completedCount = completedStudentIds.size;

        // Monthly trend for this school (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTrend = await Submission.aggregate([
            { $match: { schoolId: school._id, status: 'complete', submittedAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$submittedAt' }, month: { $month: '$submittedAt' } },
                    count: { $sum: 1 },
                    avgScore: { $avg: '$totalScore' }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } }
        ]);

        // Weekly trend for this school (last 8 weeks)
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const weeklyTrend = await Submission.aggregate([
            { $match: { schoolId: school._id, status: 'complete', submittedAt: { $gte: eightWeeksAgo } } },
            {
                $group: {
                    _id: { year: { $year: '$submittedAt' }, week: { $week: '$submittedAt' } },
                    count: { $sum: 1 },
                    avgScore: { $avg: '$totalScore' }
                }
            },
            { $sort: { '_id.year': 1, '_id.week': 1 } }
        ]);

        res.json({
            school: {
                _id: school._id,
                name: school.name,
                schoolId: school.schoolId,
                logo: school.logo,
                address: school.address
            },
            stats: {
                totalStudents,
                completedStudents: completedCount,
                pendingStudents: totalStudents - completedCount,
                completionRate: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
            },
            classes,
            recentSubmissions,
            monthlyTrend: monthlyTrend.map(m => ({
                month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
                count: m.count,
                avgScore: Math.round(m.avgScore * 10) / 10
            })),
            weeklyTrend: weeklyTrend.map(w => ({
                week: `W${w._id.week} ${w._id.year}`,
                count: w.count,
                avgScore: Math.round(w.avgScore * 10) / 10
            }))
        });

    } catch (error) {
        console.error('School analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/schools/:id/class/:className/analytics
// @desc    Get class-level analytics with student list
// @access  Admin
router.get('/schools/:id/class/:className/analytics', protect, isAdmin, async (req, res) => {
    try {
        const { section } = req.query;
        const school = await School.findById(req.params.id);
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        // Build student query
        const studentQuery = {
            schoolId: school._id,
            isActive: true,
            class: req.params.className
        };
        if (section) studentQuery.section = section;

        const students = await Student.find(studentQuery)
            .select('name accessId class section rollNo testStatus')
            .sort({ section: 1, rollNo: 1, name: 1 });

        // Get submissions for these students
        const studentIds = students.map(s => s._id);
        const submissions = await Submission.find({
            studentId: { $in: studentIds },
            status: 'complete'
        }).select('studentId totalScore sectionScores assignedBucket submittedAt');

        // Map submissions by student
        const submissionMap = {};
        submissions.forEach(sub => {
            submissionMap[sub.studentId.toString()] = sub;
        });

        // Build student list with analytics
        const studentsWithAnalytics = students.map(student => {
            const sub = submissionMap[student._id.toString()];
            return {
                _id: student._id,
                name: student.name,
                accessId: student.accessId,
                class: student.class,
                section: student.section,
                rollNo: student.rollNo,
                hasSubmission: !!sub,
                totalScore: sub?.totalScore || null,
                sectionScores: sub?.sectionScores || null,
                bucket: sub?.assignedBucket || null,
                submittedAt: sub?.submittedAt || null
            };
        });

        // Calculate class-wide stats
        const completedStudents = studentsWithAnalytics.filter(s => s.hasSubmission);
        const avgScore = completedStudents.length > 0
            ? Math.round(completedStudents.reduce((sum, s) => sum + (s.totalScore || 0), 0) / completedStudents.length)
            : 0;

        // Skill distribution for the class
        const skillDistribution = {
            A: { green: 0, yellow: 0, red: 0 }, B: { green: 0, yellow: 0, red: 0 },
            C: { green: 0, yellow: 0, red: 0 }, D: { green: 0, yellow: 0, red: 0 }
        };
        const overallDistribution = { doingWell: 0, needsSupport: 0, needsAttention: 0 };

        submissions.forEach(sub => {
            if (sub.sectionScores) {
                Object.entries(sub.sectionScores).forEach(([section, score]) => {
                    if (skillDistribution[section]) {
                        const bucket = getBucketCategory(score);
                        if (bucket !== 'unknown') skillDistribution[section][bucket]++;
                    }
                });
            }
            const overall = getOverallBucket(sub.totalScore);
            if (overall !== 'unknown') overallDistribution[overall]++;
        });

        // Get unique sections for filter
        const allStudentsInClass = await Student.find({
            schoolId: school._id,
            isActive: true,
            class: req.params.className
        }).select('section');
        const sections = [...new Set(allStudentsInClass.map(s => s.section).filter(Boolean))].sort();

        res.json({
            school: { _id: school._id, name: school.name, schoolId: school.schoolId },
            className: req.params.className,
            currentSection: section || null,
            sections,
            stats: {
                totalStudents: students.length,
                completedStudents: completedStudents.length,
                pendingStudents: students.length - completedStudents.length,
                completionRate: students.length > 0 ? Math.round((completedStudents.length / students.length) * 100) : 0,
                avgScore
            },
            skillDistribution,
            overallDistribution,
            students: studentsWithAnalytics
        });
    } catch (error) {
        console.error('Class analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/students/:studentId/analytics
// @desc    Get individual student analytics with submission details
// @access  Admin
router.get('/students/:studentId/analytics', protect, isAdmin, async (req, res) => {
    try {
        const { testId } = req.query; // Optional test filter

        // Find the student
        const student = await Student.findById(req.params.studentId)
            .populate('schoolId', 'name schoolId logo');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Build submission query
        let submissionQuery = {
            studentId: student._id,
            status: 'complete'
        };
        if (testId) {
            submissionQuery.assessmentId = testId;
        }

        // Get all submissions for this student
        const submissions = await Submission.find(submissionQuery)
            .populate('assessmentId', 'title description questions')
            .sort({ submittedAt: -1 });

        // Format submissions for frontend with detailed question answers
        const formattedSubmissions = submissions.map(sub => {
            // Map answers with question details
            const answersWithDetails = sub.answers?.map(ans => {
                const question = sub.assessmentId?.questions?.[ans.questionIndex];
                const selectedOption = question?.options?.[ans.selectedOption];
                return {
                    questionIndex: ans.questionIndex,
                    section: ans.section || question?.section,
                    questionText: question?.text || 'Question not found',
                    options: question?.options?.map(opt => ({
                        label: opt.label,
                        marks: opt.marks
                    })) || [],
                    selectedOptionIndex: ans.selectedOption,
                    selectedOptionLabel: selectedOption?.label || 'Unknown',
                    marks: ans.marks,
                    timeTakenForQuestion: ans.timeTakenForQuestion
                };
            }) || [];

            return {
                _id: sub._id,
                assessmentId: sub.assessmentId?._id,
                assessmentTitle: sub.assessmentId?.title || 'Unknown Assessment',
                totalScore: sub.totalScore,
                sectionScores: sub.sectionScores,
                sectionBuckets: sub.sectionBuckets,
                bucket: sub.assignedBucket,
                primarySkillArea: sub.primarySkillArea,
                secondarySkillArea: sub.secondarySkillArea,
                timeTaken: sub.timeTaken,
                answers: answersWithDetails,
                moodCheck: sub.moodCheck,
                submittedAt: sub.submittedAt
            };
        });

        // Get list of all tests this student has taken (for filter dropdown)
        const allSubmissions = await Submission.find({
            studentId: student._id,
            status: 'complete'
        }).populate('assessmentId', 'title').select('assessmentId');

        const testsMap = {};
        allSubmissions.forEach(sub => {
            if (sub.assessmentId) {
                testsMap[sub.assessmentId._id.toString()] = {
                    _id: sub.assessmentId._id,
                    title: sub.assessmentId.title
                };
            }
        });
        const availableTests = Object.values(testsMap);

        res.json({
            _id: student._id,
            name: student.name,
            accessId: student.accessId,
            class: student.class,
            section: student.section,
            rollNo: student.rollNo,
            school: student.schoolId ? {
                _id: student.schoolId._id,
                name: student.schoolId.name,
                schoolId: student.schoolId.schoolId,
                logo: student.schoolId.logo
            } : null,
            submissions: formattedSubmissions,
            availableTests
        });
    } catch (error) {
        console.error('Student analytics error:', error);
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
        if (error.name === 'CastError') {
            return res.status(400).json({ message: `Invalid ${error.path}: ${error.value}` });
        }
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
