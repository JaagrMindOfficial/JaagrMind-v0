const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const School = require('../models/School');
const Student = require('../models/Student');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token verification failed:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Admin only middleware
const isAdmin = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'admin') {
            const admin = await Admin.findById(req.user.id).select('-password');
            if (admin) {
                req.admin = admin;
                next();
            } else {
                res.status(401).json({ message: 'Not authorized as admin' });
            }
        } else {
            res.status(401).json({ message: 'Not authorized as admin' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// School admin only middleware
const isSchoolAdmin = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'school') {
            const school = await School.findById(req.user.id).select('-password');
            if (school) {
                req.school = school;
                next();
            } else {
                res.status(401).json({ message: 'Not authorized as school admin' });
            }
        } else {
            res.status(401).json({ message: 'Not authorized as school admin' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Student middleware (access ID based)
const isStudent = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'student') {
            const student = await Student.findById(req.user.id).populate('schoolId', 'name logo');
            if (student) {
                req.student = student;
                next();
            } else {
                res.status(401).json({ message: 'Student not found' });
            }
        } else {
            res.status(401).json({ message: 'Not authorized as student' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Generate JWT token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

module.exports = { protect, isAdmin, isSchoolAdmin, isStudent, generateToken };
