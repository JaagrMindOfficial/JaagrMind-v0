import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import lightThemeLogo from '../assets/DarkColorLogo.svg';
import darkThemeLogo from '../assets/LightColorLogo.svg';
import './Login.css';

const ChangePassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { user, updateUser, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const logoImg = theme === 'dark' ? darkThemeLogo : lightThemeLogo;

    // Redirect if not logged in or not required to change password
    useEffect(() => {
        if (!user) {
            navigate('/login');
        } else if (user.role !== 'school') {
            navigate('/admin');
        } else if (!user.mustChangePassword) {
            navigate('/school');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await api.put('/api/school/change-password', {
                newPassword
            });

            if (response.data.success) {
                // Update user state to remove mustChangePassword flag
                updateUser({ ...user, mustChangePassword: false });
                navigate('/school');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user || !user.mustChangePassword) {
        return null;
    }

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

                <p className="login-subtitle">Set Your New Password</p>

                <div style={{ textAlign: 'center', marginBottom: '20px', padding: '12px', background: 'var(--primary-bg)', borderRadius: 'var(--radius-md)' }}>
                    <p style={{ margin: 0, color: 'var(--text-dark)' }}>
                        Welcome, <strong>{user?.name}</strong>!
                    </p>
                    <small style={{ color: 'var(--text-muted)' }}>
                        For security, please set a new password.
                    </small>
                </div>

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
                        <label className="form-label">New Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            required
                            minLength={6}
                            autoComplete="new-password"
                        />
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                            Minimum 6 characters
                        </small>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirm Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            required
                            minLength={6}
                            autoComplete="new-password"
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
                                Updating...
                            </>
                        ) : (
                            'Update Password'
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline login-btn"
                        onClick={handleLogout}
                        disabled={loading}
                        style={{ marginTop: '12px' }}
                    >
                        Sign Out
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ChangePassword;
