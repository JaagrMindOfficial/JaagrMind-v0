const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const schoolSchema = new mongoose.Schema({
    schoolId: {
        type: String,
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    // Primary email for login (required for new unified login)
    email: {
        type: String,
        unique: true,
        sparse: true, // Allows null for existing records during migration
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    logo: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        trim: true
    },
    contact: {
        phone: {
            type: String,
            match: [/^[0-9]{10}$/, 'Please fill a valid 10-digit phone number']
        },
        email: {
            type: String,
            match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
        }
    },
    password: {
        type: String,
        required: true
    },
    isDataVisibleToSchool: {
        type: Boolean,
        default: false
    },
    assignedTests: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment'
    }],
    plainPassword: {
        type: String,
        default: ''
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    // New fields for unified login
    mustChangePassword: {
        type: Boolean,
        default: true
    },
    credentialsEmailSent: {
        type: Boolean,
        default: false
    },
    lastCredentialsEmailSentAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// Hash password before saving
schoolSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Match password method
schoolSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('School', schoolSchema);
