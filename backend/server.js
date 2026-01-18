require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const connectDB = require('./config/db');

// Import routes
const adminRoutes = require('./routes/admin');
const schoolRoutes = require('./routes/school');
const studentRoutes = require('./routes/student');

// Initialize express
const app = express();

// Connect to database
connectDB();

// ==================== SECURITY MIDDLEWARE ====================

// Helmet - Security headers (XSS, clickjacking, MIME sniffing, etc.)
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// Rate Limiting - Prevent DDoS and Brute Force
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per window
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit each IP to 20 login attempts per window
    message: { message: 'Too many login attempts, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

app.use(globalLimiter);

// MongoDB Injection Prevention
app.use(mongoSanitize());

// JWT Secret Strength Check (development warning only)
if (process.env.NODE_ENV !== 'production') {
    const jwtSecret = process.env.JWT_SECRET || '';
    if (jwtSecret.length < 32) {
        console.warn('\n⚠️  WARNING: JWT_SECRET is weak (< 32 chars). Use a stronger secret in production!\n');
    }
}

// ==================== END SECURITY MIDDLEWARE ====================

// CORS Configuration - Support multiple origins for dev/production
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map(origin => origin.trim());

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            if (process.env.NODE_ENV !== 'production') {
                console.log('CORS blocked origin:', origin);
            }
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (legacy - kept for backwards compatibility)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes - with auth rate limiting on login endpoints
app.use('/api/admin/login', authLimiter);
app.use('/api/school/login', authLimiter);
app.use('/api/student/login', authLimiter);
app.use('/api/admin', adminRoutes);
app.use('/api/school', schoolRoutes);
app.use('/api/student', studentRoutes);

// Health check - hide sensitive info in production
app.get('/api/health', (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.json({
        status: 'ok',
        message: 'JaagrMind API is running',
        environment: isProduction ? 'production' : (process.env.NODE_ENV || 'development'),
        // Don't expose internal config in production
        ...(isProduction ? {} : { allowedOrigins })
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);

    // Handle CORS errors
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({ message: 'CORS policy does not allow this origin' });
    }

    // Handle Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File too large. Maximum size is 10MB.' });
    }

    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║     🧠 JaagrMind Backend Server                      ║
║                                                       ║
║     Running on: http://localhost:${PORT}               ║
║     Environment: ${process.env.NODE_ENV || 'development'}                     ║
║     CORS Origins: ${allowedOrigins.length} configured              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
