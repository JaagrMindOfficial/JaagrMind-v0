const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
    questionIndex: {
        type: Number,
        required: true
    },
    section: {
        type: String,
        enum: ['A', 'B', 'C', 'D'],
        default: 'A'
    },
    selectedOption: {
        type: Number,
        default: 0
    },
    marks: {
        type: Number,
        default: 0 // Not required for incomplete submissions
    },
    timeTakenForQuestion: {
        type: Number,
        default: 0 // in seconds
    }
});

const submissionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    assessmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'incomplete', 'complete'],
        default: 'pending'
    },
    lastQuestionIndex: {
        type: Number,
        default: 0 // Track resume point for incomplete tests
    },
    totalScore: {
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
    assignedBucket: {
        type: String,
        default: '' // Empty for incomplete tests
    },
    answers: [answerSchema],
    timeTaken: {
        type: Number,
        default: 0 // in seconds
    },
    totalInactivityTime: {
        type: Number,
        default: 0 // Track total inactivity for incomplete tests
    },
    mobileNumber: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true
    },
    consentGiven: {
        type: Boolean,
        default: false
    },
    moodCheck: {
        mood: {
            type: Number,
            min: 1,
            max: 5
        },
        sleep: {
            type: String,
            enum: ['great', 'decent', 'notGreat', 'barely']
        },
        energy: {
            type: String,
            enum: ['full', 'okay', 'exhausted']
        }
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for analytics queries
submissionSchema.index({ schoolId: 1, submittedAt: -1 });
submissionSchema.index({ assessmentId: 1 });
submissionSchema.index({ assignedBucket: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
