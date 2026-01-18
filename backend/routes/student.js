const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const School = require('../models/School');
const Assessment = require('../models/Assessment');
const Submission = require('../models/Submission');
const { protect, isStudent, generateToken } = require('../middleware/auth');
const { getBucketLabel, getSectionName } = require('../utils/exportData');

// @route   POST /api/student/login
// @desc    Student login with Access ID
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { accessId, mobileNumber, email } = req.body;

        if (!accessId) {
            return res.status(400).json({ message: 'Access ID is required' });
        }

        const student = await Student.findOne({
            accessId: accessId.toUpperCase().trim(),
            isActive: true
        }).populate('schoolId', 'name logo schoolId');

        if (!student) {
            return res.status(404).json({ message: 'Invalid Access ID' });
        }

        // Update optional contact info if provided
        if (mobileNumber) student.mobileNumber = mobileNumber;
        if (email) student.email = email;
        await student.save();

        res.json({
            _id: student._id,
            accessId: student.accessId,
            name: student.name,
            class: student.class,
            section: student.section,
            school: {
                name: student.schoolId?.name,
                logo: student.schoolId?.logo,
                schoolId: student.schoolId?.schoolId
            },
            role: 'student',
            token: generateToken(student._id, 'student')
        });
    } catch (error) {
        console.error('Student login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/student/tests
// @desc    Get available tests for student
// @access  Student
router.get('/tests', protect, isStudent, async (req, res) => {
    try {
        const student = req.student;

        // Get tests assigned to this student
        const tests = student.testStatus.map(t => ({
            assessmentId: t.assessmentId,
            isCompleted: t.isCompleted,
            completedAt: t.completedAt
        }));

        // Fetch assessment details
        const assessmentIds = tests.map(t => t.assessmentId);
        const assessments = await Assessment.find({
            _id: { $in: assessmentIds },
            isActive: true
        }).select('title description inactivityAlertTime inactivityEndTime questions');

        const testsWithDetails = tests.map(t => {
            const assessment = assessments.find(
                a => a._id.toString() === t.assessmentId?.toString()
            );
            return {
                ...t,
                title: assessment?.title,
                description: assessment?.description,
                questionCount: assessment?.questions?.length || 0,
                inactivityAlertTime: assessment?.inactivityAlertTime || 40,
                inactivityEndTime: assessment?.inactivityEndTime || 120
            };
        });

        res.json({
            student: {
                name: student.name,
                class: student.class,
                section: student.section,
                school: student.schoolId
            },
            tests: testsWithDetails.filter(t => t.title)
        });
    } catch (error) {
        console.error('Get tests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/student/assessment/:id
// @desc    Get assessment questions
// @access  Student
router.get('/assessment/:id', protect, isStudent, async (req, res) => {
    try {
        const student = req.student;
        const assessmentId = req.params.id;

        // Check if student is assigned this test
        const testStatus = student.testStatus.find(
            t => t.assessmentId?.toString() === assessmentId
        );

        if (!testStatus) {
            return res.status(403).json({ message: 'You are not assigned this test' });
        }

        if (testStatus.isCompleted) {
            return res.status(400).json({ message: 'You have already completed this test' });
        }

        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        // Don't send section names to students - they shouldn't see section labels
        const questions = assessment.questions.map((q, index) => ({
            index,
            text: q.text,
            options: q.options.map(o => ({
                label: o.label
                // Don't send marks to student
            }))
        }));

        // Mark test as started
        const testIndex = student.testStatus.findIndex(
            t => t.assessmentId?.toString() === assessmentId
        );
        if (testIndex >= 0) {
            student.testStatus[testIndex].startedAt = new Date();
            await student.save();
        }

        // Check for existing incomplete submission to resume
        const existingSubmission = await Submission.findOne({
            studentId: student._id,
            assessmentId,
            status: 'incomplete'
        });

        res.json({
            _id: assessment._id,
            title: assessment.title,
            inactivityAlertTime: assessment.inactivityAlertTime,
            inactivityEndTime: assessment.inactivityEndTime,
            totalQuestions: questions.length,
            questionsPerSection: 8, // For level progression
            totalSections: 4,
            questions,
            // Resume data if exists
            resumeData: existingSubmission ? {
                lastQuestionIndex: existingSubmission.lastQuestionIndex,
                answers: existingSubmission.answers,
                submissionId: existingSubmission._id
            } : null
        });
    } catch (error) {
        console.error('Get assessment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/student/submit
// @desc    Submit assessment answers
// @access  Student
router.post('/submit', protect, isStudent, async (req, res) => {
    try {
        const { assessmentId, answers, timeTaken, mobileNumber, email, moodCheck, consentGiven } = req.body;
        const student = req.student;

        console.log('Submit request received:', { assessmentId, answersCount: answers?.length, studentId: student?._id });

        // Validate
        if (!assessmentId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: 'Invalid submission data' });
        }

        // Ensure testStatus array exists
        if (!student.testStatus) {
            student.testStatus = [];
        }

        // Check if already completed
        const testStatus = student.testStatus.find(
            t => t.assessmentId?.toString() === assessmentId
        );

        if (testStatus?.isCompleted) {
            return res.status(400).json({ message: 'Test already submitted' });
        }

        // Get assessment for scoring
        const assessment = await Assessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        console.log('Assessment found:', assessment.title, 'Questions:', assessment.questions?.length);

        // Calculate scores with null-safety
        let totalScore = 0;
        const sectionScores = { A: 0, B: 0, C: 0, D: 0 };
        const processedAnswers = [];

        answers.forEach((answer, index) => {
            if (!answer) return; // Skip null answers

            const question = assessment.questions[index];
            if (question && answer.selectedOption !== undefined && answer.selectedOption !== null) {
                const option = question.options?.[answer.selectedOption];
                const marks = option?.marks || 0;

                totalScore += marks;
                if (sectionScores.hasOwnProperty(question.section)) {
                    sectionScores[question.section] += marks;
                }

                processedAnswers.push({
                    questionIndex: index,
                    section: question.section || 'A',
                    selectedOption: answer.selectedOption,
                    marks,
                    timeTakenForQuestion: answer.timeTaken || 0
                });
            }
        });

        console.log('Scores calculated:', { totalScore, sectionScores });

        // Calculate section buckets with safe function calls
        const sectionBuckets = {
            A: getBucketLabel(sectionScores.A || 0),
            B: getBucketLabel(sectionScores.B || 0),
            C: getBucketLabel(sectionScores.C || 0),
            D: getBucketLabel(sectionScores.D || 0)
        };

        // Determine primary and secondary skill areas (highest scores = areas needing attention)
        const sectionEntries = Object.entries(sectionScores).sort((a, b) => b[1] - a[1]);
        const primarySkillArea = getSectionName(sectionEntries[0]?.[0] || 'A');
        const secondarySkillArea = getSectionName(sectionEntries[1]?.[0] || 'B');

        // Overall bucket based on total score
        const avgSectionScore = totalScore / 4;
        const assignedBucket = getBucketLabel(Math.round(avgSectionScore));

        // Handle schoolId - could be populated object or plain ObjectId
        const schoolIdValue = student.schoolId?._id || student.schoolId;

        console.log('Creating submission for schoolId:', schoolIdValue);

        // Create submission
        const submission = await Submission.create({
            studentId: student._id,
            schoolId: schoolIdValue,
            assessmentId,
            totalScore,
            sectionScores,
            sectionBuckets,
            primarySkillArea,
            secondarySkillArea,
            assignedBucket,
            answers: processedAnswers,
            timeTaken: timeTaken || 0,
            mobileNumber: mobileNumber || '',
            email: email || '',
            consentGiven: consentGiven || false,
            moodCheck: moodCheck || null,
            status: 'complete' // Mark as complete
        });

        console.log('Submission created:', submission._id);

        // Update student test status
        const testIndex = student.testStatus.findIndex(
            t => t.assessmentId?.toString() === assessmentId
        );

        if (testIndex >= 0) {
            student.testStatus[testIndex].isCompleted = true;
            student.testStatus[testIndex].score = totalScore;
            student.testStatus[testIndex].completedAt = new Date();
        } else {
            // If no test status exists, add it
            student.testStatus.push({
                assessmentId: assessmentId,
                isCompleted: true,
                score: totalScore,
                completedAt: new Date()
            });
        }

        await student.save();

        console.log('Student test status updated');

        // Return success without showing scores to student
        res.json({
            success: true,
            message: 'Assessment completed successfully. Thank you for your participation!',
            submissionId: submission._id
        });
    } catch (error) {
        console.error('Submit error:', error.message, error.stack);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   POST /api/student/save-progress
// @desc    Save incomplete assessment progress (when test auto-ends due to inactivity)
// @access  Student
router.post('/save-progress', protect, isStudent, async (req, res) => {
    try {
        const { assessmentId, answers, lastQuestionIndex, totalInactivityTime, timeTaken, moodCheck, consentGiven } = req.body;
        const student = req.student;

        console.log('Save progress request:', { assessmentId, lastQuestionIndex, answersCount: answers?.length });

        if (!assessmentId) {
            return res.status(400).json({ message: 'Assessment ID is required' });
        }

        // Format answers to match schema - add questionIndex and default marks for incomplete
        const formattedAnswers = (answers || []).map((answer, index) => {
            if (!answer) return null; // Unanswered question
            return {
                questionIndex: index,
                selectedOption: answer.selectedOption ?? answer ?? 0,
                marks: 0, // Will be calculated on completion
                timeTakenForQuestion: answer.timeTaken || answer.timeTakenForQuestion || 0,
                section: 'A' // Placeholder, will be calculated on completion
            };
        }).filter(a => a !== null); // Remove unanswered

        // Check for existing incomplete submission
        let submission = await Submission.findOne({
            studentId: student._id,
            assessmentId,
            status: { $in: ['pending', 'incomplete'] }
        });

        if (submission) {
            // Update existing incomplete submission
            submission.answers = formattedAnswers;
            submission.lastQuestionIndex = lastQuestionIndex ?? submission.lastQuestionIndex;
            submission.totalInactivityTime = totalInactivityTime ?? submission.totalInactivityTime;
            submission.timeTaken = timeTaken ?? submission.timeTaken;
            submission.status = 'incomplete';
            if (moodCheck) submission.moodCheck = moodCheck;
            await submission.save();
            console.log('Updated existing incomplete submission:', submission._id);
        } else {
            // Create new incomplete submission
            submission = await Submission.create({
                studentId: student._id,
                schoolId: student.schoolId,
                assessmentId,
                answers: formattedAnswers,
                lastQuestionIndex: lastQuestionIndex || 0,
                totalInactivityTime: totalInactivityTime || 0,
                timeTaken: timeTaken || 0,
                moodCheck: moodCheck || {},
                consentGiven: consentGiven || false,
                status: 'incomplete'
            });
            console.log('Created new incomplete submission:', submission._id);
        }

        res.json({
            success: true,
            message: 'Progress saved. You can resume later.',
            submissionId: submission._id
        });
    } catch (error) {
        console.error('Save progress error:', error.message, error.stack);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// @route   GET /api/student/school-info
// @desc    Get school info for login page branding
// @access  Public
router.get('/school-info', async (req, res) => {
    try {
        const { schoolId } = req.query;

        if (!schoolId) {
            return res.json({ name: null, logo: null });
        }

        const school = await School.findOne({
            schoolId: schoolId.toUpperCase(),
            isActive: true
        }).select('name logo');

        if (!school) {
            return res.json({ name: null, logo: null });
        }

        res.json({
            name: school.name,
            logo: school.logo
        });
    } catch (error) {
        console.error('School info error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/student/save-progress
// @desc    Save partial assessment progress
// @access  Student
router.post('/save-progress', protect, isStudent, async (req, res) => {
    try {
        const { assessmentId, answers, lastQuestionIndex, totalInactivityTime, timeTaken, moodCheck, consentGiven } = req.body;
        const student = req.student;

        if (!assessmentId) {
            return res.status(400).json({ message: 'Assessment ID is required' });
        }

        const schoolIdValue = student.schoolId?._id || student.schoolId;

        // Check for existing incomplete submission
        let submission = await Submission.findOne({
            studentId: student._id,
            assessmentId,
            status: { $in: ['pending', 'incomplete'] }
        });

        // Process answers array for partial answers
        const assessment = await Assessment.findById(assessmentId);
        const processedAnswers = [];

        if (answers && Array.isArray(answers)) {
            answers.forEach((answer, index) => {
                if (answer && answer.selectedOption !== undefined && answer.selectedOption !== null) {
                    const question = assessment?.questions?.[index];
                    const option = question?.options?.[answer.selectedOption];
                    const marks = option?.marks || 0;

                    processedAnswers.push({
                        questionIndex: index,
                        section: question?.section || 'A',
                        selectedOption: answer.selectedOption,
                        marks,
                        timeTakenForQuestion: answer.timeTaken || 0
                    });
                }
            });
        }

        if (submission) {
            // Update existing submission
            submission.answers = processedAnswers;
            submission.lastQuestionIndex = lastQuestionIndex || 0;
            submission.totalInactivityTime = totalInactivityTime || 0;
            submission.timeTaken = timeTaken || 0;
            submission.status = 'incomplete';
            if (moodCheck) submission.moodCheck = moodCheck;
            if (consentGiven !== undefined) submission.consentGiven = consentGiven;
            await submission.save();
        } else {
            // Create new incomplete submission
            submission = await Submission.create({
                studentId: student._id,
                schoolId: schoolIdValue,
                assessmentId,
                answers: processedAnswers,
                lastQuestionIndex: lastQuestionIndex || 0,
                totalInactivityTime: totalInactivityTime || 0,
                timeTaken: timeTaken || 0,
                status: 'incomplete',
                moodCheck: moodCheck || null,
                consentGiven: consentGiven || false
            });
        }

        res.json({
            success: true,
            submissionId: submission._id,
            status: 'incomplete'
        });
    } catch (error) {
        console.error('Save progress error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

module.exports = router;
