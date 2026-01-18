const mongoose = require('mongoose');

const testStatusSchema = new mongoose.Schema({
    assessmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    score: {
        type: Number,
        default: 0
    },
    sectionScores: {
        A: { type: Number, default: 0 },
        B: { type: Number, default: 0 },
        C: { type: Number, default: 0 },
        D: { type: Number, default: 0 }
    },
    sectionBuckets: {
        A: { type: String, default: '' },
        B: { type: String, default: '' },
        C: { type: String, default: '' },
        D: { type: String, default: '' }
    },
    primarySkillArea: {
        type: String,
        default: ''
    },
    secondarySkillArea: {
        type: String,
        default: ''
    },
    bucket: {
        type: String,
        default: ''
    },
    timeTaken: {
        type: Number,
        default: 0 // in seconds
    },
    startedAt: {
        type: Date
    },
    completedAt: {
        type: Date
    }
});

const studentSchema = new mongoose.Schema({
    accessId: {
        type: String,
        unique: true,
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    rollNo: {
        type: String,
        trim: true
    },
    class: {
        type: String,
        required: true,
        trim: true
    },
    section: {
        type: String,
        trim: true
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    mobileNumber: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    testStatus: [testStatusSchema],
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

// Index for faster queries
studentSchema.index({ schoolId: 1, class: 1, section: 1 });
studentSchema.index({ accessId: 1 });

module.exports = mongoose.model('Student', studentSchema);
