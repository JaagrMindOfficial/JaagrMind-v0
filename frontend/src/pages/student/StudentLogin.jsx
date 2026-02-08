import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faHome } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import lightThemeLogo from '../../assets/DarkColorLogo.svg';
import darkThemeLogo from '../../assets/LightColorLogo.svg';
import Background3D from '../../components/common/Background3D';
import './StudentLogin.css';

const StudentLogin = () => {
    const [searchParams] = useSearchParams();
    const [schoolInfo, setSchoolInfo] = useState({ name: null, logo: null });
    const [accessId, setAccessId] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [email, setEmail] = useState('');
    const [schoolCode, setSchoolCode] = useState('');
    const [step, setStep] = useState('school'); // 'school' or 'login'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const logoImg = theme === 'dark' ? darkThemeLogo : lightThemeLogo;

    useEffect(() => {
        const schoolId = searchParams.get('school');
        if (schoolId) {
            setStep('login');
            fetchSchoolInfo(schoolId);
        } else {
            setStep('school');
            setSchoolInfo({ name: null, logo: null });
        }
    }, [searchParams]);

    const fetchSchoolInfo = async (schoolId) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/student/school-info?schoolId=${schoolId}`);
            setSchoolInfo(response.data);
            setError('');
        } catch (error) {
            console.error('Error fetching school info:', error);
            setError('Invalid school link or code. Please check and try again.');
            setStep('school'); // Go back to school entry on error
        } finally {
            setLoading(false);
        }
    };

    const handleSchoolSubmit = (e) => {
        e.preventDefault();
        if (!schoolCode.trim()) {
            setError('Please enter a valid School Code');
            return;
        }

        // Preserve existing params (like 'test') and add 'school'
        const newParams = new URLSearchParams(searchParams);
        newParams.set('school', schoolCode.trim());
        navigate(`/student/login?${newParams.toString()}`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const schoolId = searchParams.get('school');
        if (!schoolId) {
            setError('Invalid access. Please use the test link provided by your school.');
            return;
        }

        // Validate Mobile Number if provided
        if (mobileNumber && !/^[0-9]{10}$/.test(mobileNumber)) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        // Validate Email if provided
        if (email && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);

        // Include schoolId from URL in login credentials
        const result = await login({ accessId, mobileNumber, email, schoolId }, 'student');

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
            {/* Background Animation */}
            <Background3D />

            <motion.div
                className="student-login-card"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
            >
                <button
                    className="theme-toggle-btn"
                    onClick={toggleTheme}
                    title="Toggle Theme"
                >
                    <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
                </button>

                <button
                    className="home-btn"
                    onClick={() => navigate('/')}
                    title="Go to Home"
                >
                    <FontAwesomeIcon icon={faHome} />
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
                    <p className="student-tagline">Student Wellness Check-in</p>
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

                {step === 'school' ? (
                    <form onSubmit={handleSchoolSubmit} className="student-form">
                        <div className="form-group">
                            <label className="form-label">
                                School Code <span className="required">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-input large"
                                placeholder="Enter School Code"
                                value={schoolCode}
                                onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                                required
                            />
                            <p className="input-hint">Enter the unique code provided by your school</p>
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
                                    Next
                                    <span className="btn-arrow">→</span>
                                </>
                            )}
                        </motion.button>
                    </form>
                ) : (
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
                                    Start Check-in
                                    <span className="btn-arrow">→</span>
                                </>
                            )}
                        </motion.button>
                        <button
                            type="button"
                            className="btn-link"
                            onClick={() => {
                                setStep('school');
                                const newParams = new URLSearchParams(searchParams);
                                newParams.delete('school');
                                navigate(`/student/login?${newParams.toString()}`);
                            }}
                            style={{
                                display: 'block',
                                width: '100%',
                                textAlign: 'center',
                                marginTop: '16px',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            Change School
                        </button>
                    </form>
                )}

                <div className="student-footer">
                    <p>Are you a school or admin? <a href="/login">Login here</a></p>
                </div>
            </motion.div>
        </div>
    );
};

export default StudentLogin;
