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
        street: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true },
        pincode: { type: String, trim: true },
        full: { type: String, trim: true } // For legacy or formatted address
    },
    type: {
        type: String,
        enum: ['super', 'sub'],
        default: 'super'
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        default: null
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

// Virtual for branches
schoolSchema.virtual('branches', {
    ref: 'School',
    localField: '_id',
    foreignField: 'parentId'
});

// Ensure virtuals are included in toJSON/toObject
schoolSchema.set('toJSON', { virtuals: true });
schoolSchema.set('toObject', { virtuals: true });

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
