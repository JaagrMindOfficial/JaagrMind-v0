const mongoose = require('mongoose');

const schoolCredentialsSchema = new mongoose.Schema({
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    schoolName: {
        type: String,
        required: true
    },
    plainPassword: {
        type: String,
        required: true
    },
    passwordHistory: [{
        password: String,
        changedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUpdatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update lastUpdatedAt on save
schoolCredentialsSchema.pre('save', function (next) {
    this.lastUpdatedAt = new Date();
    next();
});

// Static method to update password and add to history
schoolCredentialsSchema.statics.updatePassword = async function (schoolId, newPassword) {
    const credentials = await this.findOne({ schoolId });
    if (credentials) {
        // Add current password to history
        credentials.passwordHistory.push({
            password: credentials.plainPassword,
            changedAt: new Date()
        });
        credentials.plainPassword = newPassword;
        await credentials.save();
        return credentials;
    }
    return null;
};

module.exports = mongoose.model('SchoolCredentials', schoolCredentialsSchema);
