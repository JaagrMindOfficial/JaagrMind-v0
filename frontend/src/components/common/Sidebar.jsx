import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHouse,
    faSchool,
    faClipboardList,
    faChartLine,
    faUserGraduate,
    faFileLines,
    faRightFromBracket,
    faUserShield
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import lightThemeLogo from '../../assets/DarkColorLogo.svg';
import darkThemeLogo from '../../assets/LightColorLogo.svg';
import './Sidebar.css';

const adminMenuItems = [
    { path: '/admin', icon: faHouse, label: 'Dashboard', exact: true },
    { path: '/admin/schools', icon: faSchool, label: 'Schools' },
    { path: '/admin/assessments', icon: faClipboardList, label: 'Assessments' },
    { path: '/admin/analytics', icon: faChartLine, label: 'Analytics' },
    { path: '/admin/admins', icon: faUserShield, label: 'Admin Management' },
];

const schoolMenuItems = [
    { path: '/school', icon: faHouse, label: 'Dashboard', exact: true },
    { path: '/school/students', icon: faUserGraduate, label: 'Students' },
    { path: '/school/tests', icon: faFileLines, label: 'Tests' },
    { path: '/school/analytics', icon: faChartLine, label: 'Analytics' },
];

const Sidebar = () => {
    const { user, logout, isAdmin, isSchool } = useAuth();
    const { theme } = useTheme();
    const navigate = useNavigate();

    const menuItems = isAdmin ? adminMenuItems : isSchool ? schoolMenuItems : [];
    const logoImg = theme === 'dark' ? darkThemeLogo : lightThemeLogo;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <motion.div
                    className="sidebar-logo"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                >
                    <img src={logoImg} alt="JaagrMind" className="sidebar-logo-img" />
                </motion.div>
            </div>

            <nav className="sidebar-nav">
                <ul className="sidebar-menu">
                    {menuItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? 'active' : ''}`
                                }
                                end={item.exact}
                            >
                                <motion.div
                                    className="sidebar-link-content"
                                    whileHover={{ x: 4 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <FontAwesomeIcon icon={item.icon} className="sidebar-icon" />
                                    <span className="sidebar-label">{item.label}</span>
                                </motion.div>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* School Logo if logged in as school */}
            {isSchool && user?.logo && (
                <div className="sidebar-school-logo">
                    <img src={user.logo} alt={user.name} />
                    <span className="sidebar-school-name">{user.name}</span>
                </div>
            )}

            <div className="sidebar-footer">
                <button className="sidebar-logout-btn" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faRightFromBracket} />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
