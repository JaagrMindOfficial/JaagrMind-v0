const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true
    },
    marks: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    }
});

const questionSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    sectionName: {
        type: String // Internal use only - not shown to students
    },
    isPositive: {
        type: Boolean,
        default: false // Positive questions have reversed scoring
    },
    options: [optionSchema]
});

const bucketSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true
    },
    minScore: {
        type: Number,
        required: true
    },
    maxScore: {
        type: Number,
        required: true
    },
    color: {
        type: String,
        default: '#B993E9'
    }
});

const assessmentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    inactivityAlertTime: {
        type: Number,
        default: 40 // seconds before showing inactivity alert
    },
    inactivityEndTime: {
        type: Number,
        default: 120 // total seconds of inactivity before test ends
    },
    questions: [questionSchema],
    buckets: [bucketSchema],
    sectionBuckets: {
        type: Boolean,
        default: true // Use per-section bucket analysis
    },
    customSections: [{
        key: {
            type: String,
            required: true
        },
        name: {
            type: String,
            required: true
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Assessment', assessmentSchema);
