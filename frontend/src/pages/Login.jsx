import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import lightThemeLogo from '../assets/DarkColorLogo.svg';
import darkThemeLogo from '../assets/LightColorLogo.svg';
import './Login.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login, user } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const logoImg = theme === 'dark' ? darkThemeLogo : lightThemeLogo;

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'school') {
                if (user.mustChangePassword) {
                    navigate('/change-password');
                } else {
                    navigate('/school');
                }
            }
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Validate Email
            if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
                setError('Please enter a valid email address');
                setLoading(false);
                return;
            }

            // Use unified login - backend routes based on email domain
            const result = await login({ email, password }, 'unified');

            if (result.success) {
                const userData = result.user;

                if (userData.role === 'admin') {
                    navigate('/admin');
                } else if (userData.role === 'school') {
                    // Check if password change is required
                    if (userData.mustChangePassword) {
                        navigate('/change-password');
                    } else {
                        navigate('/school');
                    }
                }
            } else {
                setError(result.error || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
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
                <button
                    className="login-theme-toggle"
                    onClick={toggleTheme}
                    aria-label="Toggle theme"
                >
                    <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
                </button>

                <div className="login-logo">
                    <img src={logoImg} alt="JaagrMind" className="login-logo-img" />
                </div>

                <p className="login-subtitle">Student Mental Wellness Platform</p>

                {error && (
                    <motion.div
                        className="login-error"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        {error}
                    </motion.div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                            autoComplete="email"
                        />

                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary login-btn"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="login-spinner"></span>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <p>
                        <strong>Students:</strong> Please use the test link provided by your school.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
