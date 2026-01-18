import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPause } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import lightThemeLogo from '../../assets/DarkColorLogo.svg';
import darkThemeLogo from '../../assets/LightColorLogo.svg';

const StudentIncomplete = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { theme } = useTheme();

    const logoImg = theme === 'dark' ? darkThemeLogo : lightThemeLogo;

    const handleLogout = () => {
        logout();
        navigate('/student/login');
    };

    return (
        <div className="thankyou-container">
            <ul className="circles">
                <li></li><li></li><li></li><li></li><li></li>
                <li></li><li></li><li></li><li></li><li></li>
            </ul>

            <motion.div
                className="thankyou-card"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Logo */}
                <motion.div
                    className="thankyou-logo"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <img src={logoImg} alt="JaagrMind" style={{ height: '50px', marginBottom: '16px' }} />
                </motion.div>

                <motion.div
                    className="thankyou-icon"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                    style={{
                        width: '100px',
                        height: '100px',
                        margin: '0 auto 24px',
                        borderRadius: '50%',
                        background: 'rgba(124, 58, 237, 0.1)', // Premium purple tint
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(124, 58, 237, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 10px 25px -5px rgba(124, 58, 237, 0.3)'
                    }}
                >
                    <FontAwesomeIcon icon={faPause} style={{ color: '#7C3AED', fontSize: '40px' }} />
                </motion.div>

                <h1>Assessment Paused</h1>
                <p className="thankyou-subtitle">
                    Your assessment was paused due to inactivity, but don't worry - your progress has been saved!
                </p>

                <div className="thankyou-message">
                    <h3>What happens next?</h3>
                    <p>
                        Please log out and log in again to resume your assessment from where you left off.
                    </p>
                </div>

                <motion.div
                    className="thankyou-actions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                >
                    <button onClick={handleLogout} className="btn btn-primary btn-lg">
                        Logout & Re-login to Resume
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default StudentIncomplete;
