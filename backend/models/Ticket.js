const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    school: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        enum: ['general', 'technical', 'billing', 'feature'],
        default: 'general'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'resolved'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    responses: [{
        sender: {
            type: String, // 'admin' or 'school'
            required: true
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
});

// Update timestamp on save
ticketSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
