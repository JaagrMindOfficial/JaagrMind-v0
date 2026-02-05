const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const School = require('../models/School');
const { generateToken } = require('../middleware/auth');

// Admin email domains
const ADMIN_DOMAINS = ['jaagr.com', 'jaagrmind.com'];

/**
 * Check if email belongs to admin domain
 */
const isAdminDomain = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return ADMIN_DOMAINS.includes(domain);
};

// @route   POST /api/auth/login
// @desc    Unified login for Admin and School (email-based routing)
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check if admin domain
        if (isAdminDomain(normalizedEmail)) {
            // Admin login
            console.log(`[Auth] Attempting Admin login for: ${normalizedEmail}`);
            const admin = await Admin.findOne({ email: normalizedEmail });

            if (!admin) {
                console.log(`[Auth] Admin not found: ${normalizedEmail}`);
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isMatch = await admin.matchPassword(password);
            if (!isMatch) {
                console.log(`[Auth] Password mismatch for Admin: ${normalizedEmail}`);
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            console.log(`[Auth] Admin login successful: ${normalizedEmail}`);

            // Update last login
            admin.lastLogin = new Date();
            await admin.save();

            return res.json({
                _id: admin._id,
                email: admin.email,
                name: admin.name,
                role: 'admin',
                token: generateToken(admin._id, 'admin')
            });
        } else {
            // School login (by email)
            const school = await School.findOne({
                email: normalizedEmail,
                isActive: true
            });

            if (!school) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            if (school.isBlocked) {
                return res.status(403).json({ message: 'Your account has been blocked. Please contact administrator.' });
            }

            const isMatch = await school.matchPassword(password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            return res.json({
                _id: school._id,
                schoolId: school.schoolId,
                email: school.email,
                name: school.name,
                logo: school.logo,
                role: 'school',
                mustChangePassword: school.mustChangePassword || false,
                isDataVisibleToSchool: school.isDataVisibleToSchool,
                token: generateToken(school._id, 'school')
            });
        }
    } catch (error) {
        console.error('Unified login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
