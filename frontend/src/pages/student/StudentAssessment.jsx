import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBullseye, faBrain, faHandshake, faMobileScreen, faCheck, faClipboardList, faHeart, faRocket } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';
import './StudentAssessment.css';

const QUESTIONS_PER_SECTION = 8;
const INACTIVITY_ALERT_DEFAULT = 40; // seconds before showing inactivity alert
const INACTIVITY_END_DEFAULT = 120; // total seconds of inactivity before test ends

const sectionIcons = [faBullseye, faBrain, faHandshake, faMobileScreen];
const sectionColors = ['#B993E9', '#D4BFFF', '#9B6DD4', '#C7A6F5'];

const moodEmojis = [
    { value: 1, emoji: '😢', label: 'Very Low' },
    { value: 2, emoji: '🙁', label: 'Low' },
    { value: 3, emoji: '😐', label: 'Neutral' },
    { value: 4, emoji: '🙂', label: 'Good' },
    { value: 5, emoji: '😃', label: 'Great' }
];

const sleepOptions = [
    { value: 'great', label: 'Slept great (8+ hours)', icon: '😴' },
    { value: 'decent', label: 'Decent (6-7 hours)', icon: '🙂' },
    { value: 'notGreat', label: 'Not great (4-5 hours)', icon: '😕' },
    { value: 'barely', label: 'Barely slept (<4 hours)', icon: '😫' }
];

const energyOptions = [
    { value: 'full', label: 'Full of energy', icon: '⚡' },
    { value: 'okay', label: 'Okay, but a little tired', icon: '🙂' },
    { value: 'exhausted', label: 'Exhausted', icon: '😩' }
];

const StudentAssessment = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const toast = useToast();

    // Flow state: 'testSelect' -> 'instructions' -> 'moodCheck' -> 'countdown' -> 'assessment'
    const [flowStep, setFlowStep] = useState('testSelect');
    const [consentChecked, setConsentChecked] = useState(false);
    const [moodAnswers, setMoodAnswers] = useState({ mood: null, sleep: null, energy: null });
    const [countdownTime, setCountdownTime] = useState(10);

    const [tests, setTests] = useState([]);
    const [selectedTest, setSelectedTest] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [startTime, setStartTime] = useState(null);
    const [questionStartTime, setQuestionStartTime] = useState(null);
    const [showWarning, setShowWarning] = useState(false);

    // Inactivity tracking
    const [currentInactivityTime, setCurrentInactivityTime] = useState(0); // Per question
    const [totalInactivityTime, setTotalInactivityTime] = useState(0); // Cumulative
    const [showInactivityAlert, setShowInactivityAlert] = useState(false);
    const [resumeSubmissionId, setResumeSubmissionId] = useState(null);
    const [inactivitySettings, setInactivitySettings] = useState({
        alertTime: INACTIVITY_ALERT_DEFAULT,
        endTime: INACTIVITY_END_DEFAULT
    });

    // Track last activity time to properly detect inactivity
    const lastActivityTimeRef = useRef(Date.now());

    useEffect(() => {
        fetchTests();
    }, []);

    // Countdown timer effect
    useEffect(() => {
        if (flowStep !== 'countdown') return;

        const timer = setInterval(() => {
            setCountdownTime(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    startActualAssessment();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [flowStep]);

    // Inactivity timer effect - hidden from user
    const isEndingRef = useRef(false);

    // Activity detection - reset inactivity on ANY user interaction (throttled)
    useEffect(() => {
        if (!assessment || flowStep !== 'assessment') return;

        let lastHandledTime = 0;
        const THROTTLE_MS = 500; // Only handle activity every 500ms to prevent over-triggering

        const handleActivity = () => {
            const now = Date.now();
            // Throttle: only handle activity if 500ms has passed since last handled
            if (now - lastHandledTime < THROTTLE_MS) return;
            lastHandledTime = now;

            lastActivityTimeRef.current = now;
            // Reset BOTH inactivity counters when user is active
            setCurrentInactivityTime(0);
            setTotalInactivityTime(0); // Critical: reset total so test doesn't end after activity
            // Hide inactivity alert if user becomes active
            if (showInactivityAlert) {
                setShowInactivityAlert(false);
            }
        };

        // Listen for any user activity
        window.addEventListener('mousemove', handleActivity, { passive: true });
        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('keydown', handleActivity);
        window.addEventListener('touchstart', handleActivity, { passive: true });
        window.addEventListener('scroll', handleActivity, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('scroll', handleActivity);
        };
    }, [assessment, flowStep, showInactivityAlert]);

    // Inactivity timer - checks every second if user has been inactive
    useEffect(() => {
        if (!assessment || flowStep !== 'assessment') return;

        // Reset ending flag when assessment starts
        isEndingRef.current = false;

        const timer = setInterval(() => {
            const now = Date.now();
            const secondsSinceActivity = Math.floor((now - lastActivityTimeRef.current) / 1000);

            // Only count inactivity if user hasn't moved/clicked/typed in over 1 second
            if (secondsSinceActivity >= 1) {
                setCurrentInactivityTime(prev => {
                    const newTime = prev + 1;

                    // Check for inactivity alert - only show if not already showing
                    if (newTime >= inactivitySettings.alertTime && !showInactivityAlert) {
                        setShowInactivityAlert(true);
                    }

                    return newTime;
                });

                setTotalInactivityTime(prev => prev + 1);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [assessment, flowStep, inactivitySettings.alertTime, showInactivityAlert]);

    // Separate effect to handle test end - prevents race conditions
    useEffect(() => {
        if (totalInactivityTime >= inactivitySettings.endTime && !isEndingRef.current && flowStep === 'assessment') {
            isEndingRef.current = true;
            handleInactivityEnd();
        }
    }, [totalInactivityTime, inactivitySettings.endTime, flowStep]);

    // Handle test end due to inactivity
    const handleInactivityEnd = async () => {
        try {
            const timeTaken = Math.round((Date.now() - startTime) / 1000);

            await api.post('/api/student/save-progress', {
                assessmentId: assessment._id,
                answers,
                lastQuestionIndex: currentQuestion,
                totalInactivityTime,
                timeTaken,
                moodCheck: moodAnswers,
                consentGiven: true
            });

            // Navigate to incomplete page
            navigate('/student/incomplete');
        } catch (error) {
            console.error('Error saving progress:', error);
            navigate('/student/incomplete');
        }
    };

    const fetchTests = async () => {
        try {
            const response = await api.get('/api/student/tests');
            const availableTests = response.data.tests.filter(t => !t.isCompleted);
            setTests(availableTests);
            // Always show welcome page with test selection, even for single test
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTestSelect = (test) => {
        setSelectedTest(test);
        setFlowStep('instructions');
    };

    const handleConsentProceed = () => {
        if (consentChecked) {
            setFlowStep('moodCheck');
        }
    };

    const handleMoodAnswer = (type, value) => {
        setMoodAnswers(prev => ({ ...prev, [type]: value }));
    };

    const handleMoodProceed = () => {
        if (moodAnswers.mood && moodAnswers.sleep && moodAnswers.energy) {
            setFlowStep('countdown');
            setCountdownTime(10);
        }
    };

    const startActualAssessment = async () => {
        if (!selectedTest) return;
        try {
            setLoading(true);
            const response = await api.get(`/api/student/assessment/${selectedTest.assessmentId}`);
            const data = response.data;

            setAssessment(data);
            setInactivitySettings({
                alertTime: data.inactivityAlertTime || INACTIVITY_ALERT_DEFAULT,
                endTime: data.inactivityEndTime || INACTIVITY_END_DEFAULT
            });

            // Check for resume data
            if (data.resumeData) {
                // Resume from saved state
                const resumeAnswers = new Array(data.questions.length).fill(null);
                data.resumeData.answers.forEach(ans => {
                    resumeAnswers[ans.questionIndex] = {
                        selectedOption: ans.selectedOption,
                        timeTaken: ans.timeTakenForQuestion
                    };
                });
                setAnswers(resumeAnswers);
                setCurrentQuestion(data.resumeData.lastQuestionIndex);
                setResumeSubmissionId(data.resumeData.submissionId);
                setCurrentLevel(Math.floor(data.resumeData.lastQuestionIndex / QUESTIONS_PER_SECTION) + 1);
            } else {
                setAnswers(new Array(data.questions.length).fill(null));
            }

            setStartTime(Date.now());
            setQuestionStartTime(Date.now());
            setCurrentInactivityTime(0);
            setFlowStep('assessment');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error loading assessment');
        } finally {
            setLoading(false);
        }
    };

    const startAssessment = async (assessmentId) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/student/assessment/${assessmentId}`);
            setAssessment(response.data);
            setAnswers(new Array(response.data.questions.length).fill(null));
            setStartTime(Date.now());
            setQuestionStartTime(Date.now());
            setTimeLeft(TIME_PER_QUESTION);
            setFlowStep('assessment');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error loading assessment');
        } finally {
            setLoading(false);
        }
    };

    const selectOption = (optionIndex) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestion] = {
            selectedOption: optionIndex,
            timeTaken: Math.round((Date.now() - questionStartTime) / 1000)
        };
        setAnswers(newAnswers);
        setShowWarning(false);
        setShowInactivityAlert(false);

        // Reset current inactivity timer when answer selected
        setCurrentInactivityTime(0);
    };

    const handleNext = useCallback(() => {
        // Check if current question is answered
        if (!answers[currentQuestion]) {
            setShowWarning(true);
            return;
        }

        setShowWarning(false);

        if (currentQuestion < assessment.questions.length - 1) {
            const nextQuestion = currentQuestion + 1;

            // Check for level up (every 8 questions)
            if (nextQuestion % QUESTIONS_PER_SECTION === 0 && nextQuestion > 0) {
                setShowLevelUp(true);
                setCurrentLevel(prev => prev + 1);
                setTimeout(() => {
                    setShowLevelUp(false);
                    setCurrentQuestion(nextQuestion);
                    setQuestionStartTime(Date.now());
                    setCurrentInactivityTime(0);
                }, 2500);
            } else {
                setCurrentQuestion(nextQuestion);
                setQuestionStartTime(Date.now());
                setCurrentInactivityTime(0);
            }
        } else {
            // Submit assessment
            handleSubmit();
        }
    }, [currentQuestion, assessment, answers]);

    const handlePrev = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
            setQuestionStartTime(Date.now());
            setCurrentInactivityTime(0);
        }
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const timeTaken = Math.round((Date.now() - startTime) / 1000);

            await api.post('/api/student/submit', {
                assessmentId: assessment._id,
                answers,
                timeTaken,
                mobileNumber: user.mobileNumber,
                email: user.email,
                moodCheck: moodAnswers,
                consentGiven: true
            });

            navigate('/student/thankyou');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error submitting assessment');
            setSubmitting(false);
        }
    };

    // Instructions Screen
    if (flowStep === 'instructions') {
        return (
            <div className="assessment-container">
                <ul className="circles">
                    <li></li><li></li><li></li><li></li><li></li>
                    <li></li><li></li><li></li><li></li><li></li>
                </ul>
                <motion.div
                    className="instructions-card"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="instructions-icon">
                        <FontAwesomeIcon icon={faClipboardList} />
                    </div>
                    <h2>Before You Begin</h2>
                    <p className="instructions-subtitle">Please read the following instructions carefully</p>

                    <div className="instruction-list">
                        <div className="instruction-item">
                            <span className="instruction-number">1</span>
                            <p>Read each statement carefully and choose the option that best describes how true it is for you in your day-to-day school life.</p>
                        </div>
                        <div className="instruction-item">
                            <span className="instruction-number">2</span>
                            <p>There are <strong>no right or wrong answers</strong>. This is about understanding you better.</p>
                        </div>
                        <div className="instruction-item">
                            <span className="instruction-number">3</span>
                            <p>Answer <strong>honestly</strong>. Your responses help us provide the best support for you.</p>
                        </div>
                    </div>

                    <label className="consent-checkbox">
                        <input
                            type="checkbox"
                            checked={consentChecked}
                            onChange={(e) => setConsentChecked(e.target.checked)}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="checkbox-label">
                            I have read all the instructions carefully and I give my consent to proceed with the assessment
                        </span>
                    </label>

                    <motion.button
                        className={`btn-proceed ${consentChecked ? 'active' : 'disabled'}`}
                        onClick={handleConsentProceed}
                        disabled={!consentChecked}
                        whileHover={consentChecked ? { scale: 1.02 } : {}}
                        whileTap={consentChecked ? { scale: 0.98 } : {}}
                    >
                        Continue to Mood Check
                        <span className="btn-arrow">→</span>
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    // Mood Check Screen
    if (flowStep === 'moodCheck') {
        const allMoodAnswered = moodAnswers.mood && moodAnswers.sleep && moodAnswers.energy;

        return (
            <div className="assessment-container">
                <ul className="circles">
                    <li></li><li></li><li></li><li></li><li></li>
                    <li></li><li></li><li></li><li></li><li></li>
                </ul>
                <motion.div
                    className="mood-card"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="mood-header">
                        <FontAwesomeIcon icon={faHeart} className="mood-icon" />
                        <h2>Quick Mood Check</h2>
                        <p>Let us know how you're feeling before we begin</p>
                    </div>

                    {/* Question 1: Mood Scale */}
                    <div className="mood-question">
                        <h3>1. On a scale of 1-5, how are you feeling today?</h3>
                        <div className="mood-scale">
                            {moodEmojis.map((item) => (
                                <motion.button
                                    key={item.value}
                                    className={`mood-emoji ${moodAnswers.mood === item.value ? 'selected' : ''}`}
                                    onClick={() => handleMoodAnswer('mood', item.value)}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <span className="emoji">{item.emoji}</span>
                                    <span className="emoji-label">{item.label}</span>
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Question 2: Sleep */}
                    <div className="mood-question">
                        <h3>2. How well did you sleep last night?</h3>
                        <div className="radio-group">
                            {sleepOptions.map((option) => (
                                <motion.button
                                    key={option.value}
                                    className={`radio-option ${moodAnswers.sleep === option.value ? 'selected' : ''}`}
                                    onClick={() => handleMoodAnswer('sleep', option.value)}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <span className="radio-icon">{option.icon}</span>
                                    <span className="radio-label">{option.label}</span>
                                    {moodAnswers.sleep === option.value && (
                                        <motion.span
                                            className="radio-check"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                        >
                                            ✓
                                        </motion.span>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    {/* Question 3: Energy */}
                    <div className="mood-question">
                        <h3>3. How's your energy level right now?</h3>
                        <div className="radio-group">
                            {energyOptions.map((option) => (
                                <motion.button
                                    key={option.value}
                                    className={`radio-option ${moodAnswers.energy === option.value ? 'selected' : ''}`}
                                    onClick={() => handleMoodAnswer('energy', option.value)}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                >
                                    <span className="radio-icon">{option.icon}</span>
                                    <span className="radio-label">{option.label}</span>
                                    {moodAnswers.energy === option.value && (
                                        <motion.span
                                            className="radio-check"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                        >
                                            ✓
                                        </motion.span>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>

                    <motion.button
                        className={`btn-proceed ${allMoodAnswered ? 'active' : 'disabled'}`}
                        onClick={handleMoodProceed}
                        disabled={!allMoodAnswered}
                        whileHover={allMoodAnswered ? { scale: 1.02 } : {}}
                        whileTap={allMoodAnswered ? { scale: 0.98 } : {}}
                    >
                        Start Assessment
                        <FontAwesomeIcon icon={faRocket} className="btn-icon" />
                    </motion.button>
                </motion.div>
            </div>
        );
    }

    // Countdown Screen
    if (flowStep === 'countdown') {
        return (
            <div className="assessment-container">
                <ul className="circles">
                    <li></li><li></li><li></li><li></li><li></li>
                    <li></li><li></li><li></li><li></li><li></li>
                </ul>
                <motion.div
                    className="countdown-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <motion.div
                        className="countdown-content"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                    >
                        <div className="countdown-icon-wrapper">
                            <FontAwesomeIcon icon={faRocket} className="countdown-rocket-icon" />
                        </div>
                        <h2>Get Ready!</h2>
                        <p>Your assessment will begin in</p>

                        <motion.div
                            className="countdown-timer"
                            key={countdownTime}
                            initial={{ scale: 1.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", duration: 0.3 }}
                        >
                            {countdownTime}
                        </motion.div>

                        <p className="countdown-subtitle">seconds</p>

                        <motion.button
                            className="btn-start-now"
                            onClick={startActualAssessment}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            Start Now
                            <span className="btn-arrow">→</span>
                        </motion.button>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // Test Selection Screen
    if (flowStep === 'testSelect' && !loading) {
        if (tests.length === 0) {
            return (
                <div className="assessment-container">
                    <div className="no-tests-card">
                        <div className="no-tests-icon">📝</div>
                        <h2>No Tests Available</h2>
                        <p>You don't have any pending assessments.</p>
                        <button className="btn btn-secondary" onClick={() => { logout(); navigate('/student/login'); }}>
                            Logout
                        </button>
                    </div>
                </div>
            );
        }

        return (
            <div className="assessment-container">
                <ul className="circles">
                    <li></li><li></li><li></li><li></li><li></li>
                    <li></li><li></li><li></li><li></li><li></li>
                </ul>
                <motion.div
                    className="test-selection-card"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h2>Welcome, {user?.name}!</h2>
                    <p>Select an assessment to begin:</p>

                    <div className="test-list">
                        {tests.map((test, index) => (
                            <motion.button
                                key={test.assessmentId}
                                className="test-option"
                                onClick={() => handleTestSelect(test)}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <span className="test-icon">📝</span>
                                <span className="test-title">{test.title}</span>
                                <span className="test-meta">{test.questionCount} questions</span>
                            </motion.button>
                        ))}
                    </div>
                </motion.div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="assessment-container">
                <div className="loading-card">
                    <div className="spinner large"></div>
                    <p>Loading assessment...</p>
                </div>
            </div>
        );
    }

    if (flowStep !== 'assessment' || !assessment) {
        return null;
    }

    // Calculate dynamic number of sections based on total questions
    const totalQuestions = assessment.questions.length;
    const totalSections = Math.ceil(totalQuestions / QUESTIONS_PER_SECTION);
    const currentSection = Math.min(Math.floor(currentQuestion / QUESTIONS_PER_SECTION), totalSections - 1);
    const progressInSection = (currentQuestion % QUESTIONS_PER_SECTION) + 1;
    const totalProgress = ((currentQuestion + 1) / totalQuestions) * 100;

    return (
        <div className="assessment-container">
            {/* Background Animation */}
            <ul className="circles">
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
                <li></li>
            </ul>

            {/* Level Up Animation */}
            <AnimatePresence>
                {showLevelUp && (
                    <motion.div
                        className="level-up-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="level-up-content"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, rotate: 180 }}
                            transition={{ type: "spring", duration: 0.8 }}
                        >
                            <div className="level-up-ribbon">🎉</div>
                            <h2>Level {currentLevel - 1} Complete!</h2>
                            <p>Great job! Moving to Level {currentLevel}!</p>
                            <div className="level-up-stars">⭐⭐⭐</div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Inactivity Alert Modal */}
            <AnimatePresence>
                {showInactivityAlert && (
                    <motion.div
                        className="inactivity-alert-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="inactivity-alert-content"
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 20 }}
                        >
                            <div className="inactivity-icon">⚠️</div>
                            <h3>Are you still there?</h3>
                            <p>Please select an option to continue, or the assessment may end.</p>
                            <button
                                className="btn btn-primary"
                                onClick={() => { setShowInactivityAlert(false); setCurrentInactivityTime(0); }}
                            >
                                I'm here! Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Assessment Card */}
            <motion.div
                className="assessment-card"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {/* Header */}
                <div className="assessment-header">
                    <div className="header-left">
                        <span className="level-badge" style={{ background: sectionColors[currentSection % sectionColors.length] }}>
                            <FontAwesomeIcon icon={sectionIcons[currentSection % sectionIcons.length]} /> Level {currentLevel}
                        </span>
                    </div>
                    <div className="header-center">
                        <div className="progress-info">
                            Question {currentQuestion + 1} of {assessment.questions.length}
                        </div>
                    </div>
                    <div className="header-right">
                        {/* Timer hidden - inactivity is tracked silently */}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                    <div className="section-indicators">
                        {Array.from({ length: totalSections }).map((_, section) => (
                            <div
                                key={section}
                                className={`section-dot ${section < currentSection ? 'completed' : ''} ${section === currentSection ? 'active' : ''}`}
                                style={{ background: section <= currentSection ? sectionColors[section % sectionColors.length] : undefined }}
                            >
                                {section < currentSection ? <FontAwesomeIcon icon={faCheck} /> : <FontAwesomeIcon icon={sectionIcons[section % sectionIcons.length]} />}
                            </div>
                        ))}
                    </div>
                    <div className="progress-bar">
                        <motion.div
                            className="progress-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${totalProgress}%` }}
                            style={{ background: sectionColors[currentSection % sectionColors.length] }}
                        />
                    </div>
                </div>

                {/* Question */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestion}
                        className="question-section"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                    >
                        <h3 className="question-text">
                            {assessment.questions[currentQuestion].text}
                        </h3>

                        {showWarning && (
                            <motion.div
                                className="question-warning"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                ⚠️ Please select an option to continue
                            </motion.div>
                        )}

                        <div className="options-grid">
                            {assessment.questions[currentQuestion].options.map((option, index) => (
                                <motion.button
                                    key={index}
                                    className={`option-btn ${answers[currentQuestion]?.selectedOption === index ? 'selected' : ''}`}
                                    onClick={() => selectOption(index)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <span className="option-number">{index + 1}</span>
                                    <span className="option-label">{option.label}</span>
                                    {answers[currentQuestion]?.selectedOption === index && (
                                        <motion.span
                                            className="option-check"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                        >
                                            ✓
                                        </motion.span>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation */}
                <div className="navigation-section">
                    <button
                        className="nav-btn prev"
                        onClick={handlePrev}
                        disabled={currentQuestion === 0}
                    >
                        ← Previous
                    </button>

                    <div className="question-dots">
                        {Array.from({ length: QUESTIONS_PER_SECTION }).map((_, i) => {
                            const questionIndex = currentSection * QUESTIONS_PER_SECTION + i;
                            if (questionIndex >= assessment.questions.length) return null;
                            return (
                                <span
                                    key={i}
                                    className={`q-dot ${questionIndex === currentQuestion ? 'current' : ''} ${answers[questionIndex] ? 'answered' : ''}`}
                                />
                            );
                        })}
                    </div>

                    <motion.button
                        className={`nav-btn next ${currentQuestion === assessment.questions.length - 1 ? 'submit' : ''} ${!answers[currentQuestion] ? 'disabled-look' : ''}`}
                        onClick={handleNext}
                        disabled={submitting}
                        whileHover={answers[currentQuestion] ? { scale: 1.05 } : {}}
                        whileTap={answers[currentQuestion] ? { scale: 0.95 } : {}}
                    >
                        {submitting ? (
                            <span className="btn-spinner"></span>
                        ) : currentQuestion === assessment.questions.length - 1 ? (
                            'Submit ✓'
                        ) : (
                            'Next →'
                        )}
                    </motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default StudentAssessment;
