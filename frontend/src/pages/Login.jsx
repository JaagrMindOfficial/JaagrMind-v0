import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey, faSchool, faMoon, faSun, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import lightThemeLogo from '../assets/DarkColorLogo.svg';
import darkThemeLogo from '../assets/LightColorLogo.svg';
import './Login.css';

const Login = () => {
    const [loginType, setLoginType] = useState('admin'); // admin or school
    const [email, setEmail] = useState('');
    const [schoolId, setSchoolId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const logoImg = theme === 'dark' ? darkThemeLogo : lightThemeLogo;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const credentials = loginType === 'admin'
            ? { email, password }
            : { schoolId, password };

        const result = await login(credentials, loginType);

        setLoading(false);

        if (result.success) {
            navigate(`/${loginType}`);
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="login-container">
            <motion.div
                className="login-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Theme Toggle */}
                <button
                    className="login-theme-toggle"
                    onClick={toggleTheme}
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
                </button>

                {/* Logo */}
                <motion.div
                    className="login-logo"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                >
                    <img src={logoImg} alt="JaagrMind" className="login-logo-img" />
                </motion.div>

                <p className="login-subtitle">
                    Student Mental Wellness Platform
                </p>

                {/* Login Type Tabs */}
                <div className="login-tabs">
                    <button
                        className={`login-tab ${loginType === 'admin' ? 'active' : ''}`}
                        onClick={() => setLoginType('admin')}
                    >
                        <FontAwesomeIcon icon={faKey} /> Admin
                    </button>
                    <button
                        className={`login-tab ${loginType === 'school' ? 'active' : ''}`}
                        onClick={() => setLoginType('school')}
                    >
                        <FontAwesomeIcon icon={faSchool} /> School
                    </button>
                </div>

                {error && (
                    <motion.div
                        className="login-error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    {loginType === 'admin' ? (
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="admin email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">School ID</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="SCHOOL ID"
                                value={schoolId}
                                onChange={(e) => setSchoolId(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? "Hide password" : "Show password"}
                            >
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </button>
                        </div>
                    </div>

                    <motion.button
                        type="submit"
                        className="btn btn-primary btn-lg login-btn"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        {loading ? (
                            <span className="login-spinner"></span>
                        ) : (
                            'Sign In'
                        )}
                    </motion.button>
                </form>

                <div className="login-footer">
                    <p>Students? <a href="/student/login">Enter with Access ID →</a></p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
