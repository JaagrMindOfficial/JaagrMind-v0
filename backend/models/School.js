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
    logo: {
        type: String,
        default: ''
    },
    address: {
        type: String,
        trim: true
    },
    contact: {
        phone: String,
        email: String
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
