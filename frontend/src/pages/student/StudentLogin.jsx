import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import lightThemeLogo from '../../assets/DarkColorLogo.svg';
import darkThemeLogo from '../../assets/LightColorLogo.svg';
import './StudentLogin.css';

const StudentLogin = () => {
    const [searchParams] = useSearchParams();
    const [schoolInfo, setSchoolInfo] = useState({ name: null, logo: null });
    const [accessId, setAccessId] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const logoImg = theme === 'dark' ? darkThemeLogo : lightThemeLogo;

    useEffect(() => {
        const schoolId = searchParams.get('school');
        if (schoolId) {
            fetchSchoolInfo(schoolId);
        }
    }, [searchParams]);

    const fetchSchoolInfo = async (schoolId) => {
        try {
            const response = await api.get(`/api/student/school-info?schoolId=${schoolId}`);
            setSchoolInfo(response.data);
        } catch (error) {
            console.error('Error fetching school info:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login({ accessId, mobileNumber, email }, 'student');

        setLoading(false);

        if (result.success) {
            navigate('/student');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="student-login-container">
            {/* Background Animation */}
            <div className="student-bg-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>

            <motion.div
                className="student-login-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <button
                    className="theme-toggle-btn"
                    onClick={toggleTheme}
                >
                    <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
                </button>

                {/* JaagrMind Logo */}
                <div className="student-logo-section">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.8 }}
                    >
                        <img src={logoImg} alt="JaagrMind" className="student-logo-img" />
                    </motion.div>
                    <p className="student-tagline">Student Wellness Assessment</p>
                </div>

                {/* School Branding */}
                {schoolInfo.name && (
                    <motion.div
                        className="school-branding-box"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {schoolInfo.logo && (
                            <img src={schoolInfo.logo} alt={schoolInfo.name} className="school-logo-small" />
                        )}
                        <span>{schoolInfo.name}</span>
                    </motion.div>
                )}

                {error && (
                    <motion.div
                        className="student-error"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="student-form">
                    <div className="form-group">
                        <label className="form-label">
                            Access ID <span className="required">*</span>
                        </label>
                        <input
                            type="text"
                            className="form-input large"
                            placeholder="Enter your Access ID"
                            value={accessId}
                            onChange={(e) => setAccessId(e.target.value.toUpperCase())}
                            required
                        />
                        <p className="input-hint">Your unique ID provided by your school</p>
                    </div>

                    <div className="optional-fields">
                        <p className="optional-label">Optional Information</p>
                        <div className="form-row">
                            <div className="form-group">
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="Mobile Number"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="Email (optional)"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <motion.button
                        type="submit"
                        className="btn btn-primary btn-lg student-submit-btn"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {loading ? (
                            <span className="btn-spinner"></span>
                        ) : (
                            <>
                                Start Assessment
                                <span className="btn-arrow">→</span>
                            </>
                        )}
                    </motion.button>
                </form>

                <div className="student-footer">
                    <p>Are you a school or admin? <a href="/login">Login here</a></p>
                </div>
            </motion.div>
        </div>
    );
};

export default StudentLogin;
