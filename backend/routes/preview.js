const express = require('express');
const router = express.Router();
const Assessment = require('../models/Assessment');
const { protect } = require('../middleware/auth');

// Middleware to check if user is admin or school
const isAuthorizedPreviewer = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'school')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized for preview' });
    }
};

// @route   GET /api/preview/assessment/:id
// @desc    Get assessment for preview (Admin/School only)
// @access  Private (Admin/School)
router.get('/assessment/:id', protect, isAuthorizedPreviewer, async (req, res) => {
    try {
        const assessmentId = req.params.id;
        const assessment = await Assessment.findById(assessmentId);

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Format questions similarly to student view (but maybe keep marks? actually StudentAssessment doesn't use marks for display usually)
        // We will return same format as student endpoint to ensure compatibility
        const questions = assessment.questions.map((q, index) => ({
            index,
            text: q.text,
            options: q.options.map(o => ({
                label: o.label
                // We can include marks for preview if we want, but StudentAssessment might not show them
            }))
        }));

        res.json({
            _id: assessment._id,
            title: assessment.title,
            inactivityAlertTime: assessment.inactivityAlertTime,
            inactivityEndTime: assessment.inactivityEndTime,
            totalQuestions: questions.length,
            questionsPerSection: 8,
            totalSections: 4,
            questions,
            resumeData: null // No resume data for preview
        });

    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
