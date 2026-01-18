const mongoose = require('mongoose');

const archivedDataSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['student', 'school'],
        required: true,
        index: true
    },
    archivedAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    archivedBy: {
        type: String, // 'school' or 'admin'
        required: true
    },
    reason: {
        type: String,
        default: 'manual_deletion'
    },

    // For student archival
    studentData: {
        _id: mongoose.Schema.Types.ObjectId,
        accessId: String,
        name: String,
        rollNo: String,
        class: String,
        section: String,
        schoolId: mongoose.Schema.Types.ObjectId,
        schoolName: String, // Denormalized
        testStatus: Array,
        createdAt: Date
    },
    studentSubmissions: [{
        assessmentId: mongoose.Schema.Types.ObjectId,
        assessmentTitle: String, // Denormalized
        totalScore: Number,
        sectionScores: mongoose.Schema.Types.Mixed,
        assignedBucket: String,
        submittedAt: Date,
        answers: Array
    }],

    // For school archival
    schoolData: {
        _id: mongoose.Schema.Types.ObjectId,
        schoolId: String,
        name: String,
        logo: String,
        address: String,
        contact: mongoose.Schema.Types.Mixed,
        isDataVisibleToSchool: Boolean,
        assignedTests: [mongoose.Schema.Types.ObjectId],
        createdAt: Date
    },
    schoolStudents: [{
        _id: mongoose.Schema.Types.ObjectId,
        accessId: String,
        name: String,
        rollNo: String,
        class: String,
        section: String,
        testStatus: Array,
        createdAt: Date
    }],
    schoolSubmissions: [{
        studentId: mongoose.Schema.Types.ObjectId,
        studentName: String, // Denormalized
        assessmentId: mongoose.Schema.Types.ObjectId,
        assessmentTitle: String, // Denormalized
        totalScore: Number,
        sectionScores: mongoose.Schema.Types.Mixed,
        assignedBucket: String,
        submittedAt: Date,
        answers: Array
    }],

    // Stats for quick reference
    stats: {
        studentCount: Number,
        submissionCount: Number
    }
});

// Index for querying archived data
archivedDataSchema.index({ type: 1, archivedAt: -1 });
archivedDataSchema.index({ 'studentData.schoolId': 1 });
archivedDataSchema.index({ 'schoolData._id': 1 });

module.exports = mongoose.model('ArchivedData', archivedDataSchema);
