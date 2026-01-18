import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faGear, faRightFromBracket, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

const Header = ({ title, subtitle }) => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="header">
            <div className="header-left">
                <div className="header-title-section">
                    <h1 className="header-title">{title}</h1>
                    {subtitle && <p className="header-subtitle">{subtitle}</p>}
                </div>
            </div>

            <div className="header-right">
                {/* Dark Mode Toggle */}
                <motion.button
                    className="header-icon-btn"
                    onClick={toggleTheme}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
                </motion.button>

                {/* User Dropdown */}
                <div className={`dropdown ${dropdownOpen ? 'open' : ''}`}>
                    <button
                        className="header-user-btn"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        <div className="header-user-avatar">
                            {user?.name?.[0] || user?.email?.[0] || 'U'}
                        </div>
                        <span className="header-user-name">
                            {user?.name || user?.schoolId || 'User'}
                        </span>
                        <FontAwesomeIcon icon={faChevronDown} className="header-dropdown-arrow" />
                    </button>

                    <div className="dropdown-menu">
                        <div className="dropdown-header">
                            <div className="dropdown-user-info">
                                <span className="dropdown-user-name">{user?.name || user?.schoolId}</span>
                                <span className="dropdown-user-role">{user?.role?.toUpperCase()}</span>
                            </div>
                        </div>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item" onClick={() => navigate('/settings')}>
                            <FontAwesomeIcon icon={faGear} /> Settings
                        </button>
                        <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
                            <FontAwesomeIcon icon={faRightFromBracket} /> Logout
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
