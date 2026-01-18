import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import './ThankYou.css';

const ThankYou = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/student/login');
    };

    return (
        <div className="thankyou-container">
            {/* Confetti Animation */}
            <div className="confetti-container">
                {Array.from({ length: 50 }).map((_, i) => (
                    <div
                        key={i}
                        className="confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            backgroundColor: ['#B993E9', '#D4BFFF', '#10B981', '#F59E0B', '#EF4444'][Math.floor(Math.random() * 5)]
                        }}
                    />
                ))}
            </div>

            <motion.div
                className="thankyou-card"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
            >
                <motion.div
                    className="thankyou-icon"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", delay: 0.3 }}
                >
                    🎉
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    Thank You!
                </motion.h1>

                <motion.p
                    className="thankyou-message"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    You have successfully completed the wellness assessment.
                    Your responses have been recorded.
                </motion.p>

                <motion.div
                    className="thankyou-note"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <div className="note-icon">💡</div>
                    <p>
                        Remember: This assessment helps us understand how we can support your growth.
                        There are no right or wrong answers, only opportunities to learn more about yourself.
                    </p>
                </motion.div>

                <motion.div
                    className="thankyou-badges"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                >
                    <div className="badge-item">
                        <span className="badge-emoji">⭐</span>
                        <span>Assessment Complete</span>
                    </div>
                    <div className="badge-item">
                        <span className="badge-emoji">🎯</span>
                        <span>All Questions Answered</span>
                    </div>
                    <div className="badge-item">
                        <span className="badge-emoji">🌟</span>
                        <span>Great Effort!</span>
                    </div>
                </motion.div>

                <motion.button
                    className="btn btn-primary btn-lg logout-btn"
                    onClick={handleLogout}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <span>🚪</span>
                    <span>Logout</span>
                </motion.button>

                <motion.div
                    className="jaagrmind-footer"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                >
                    <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="45" fill="url(#tyGradient)" />
                        <path d="M35 45C35 40 40 35 50 35C60 35 65 42 65 48C65 55 60 58 55 60C52 61 50 63 50 67" stroke="white" strokeWidth="5" strokeLinecap="round" />
                        <circle cx="50" cy="77" r="4" fill="white" />
                        <defs>
                            <linearGradient id="tyGradient" x1="0" y1="0" x2="100" y2="100">
                                <stop stopColor="#B993E9" />
                                <stop offset="1" stopColor="#D4BFFF" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <span>JaagrMind</span>
                </motion.div>
            </motion.div>
        </div>
    );
};

export default ThankYou;
