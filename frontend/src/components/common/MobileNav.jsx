import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHouse,
    faSchool,
    faClipboardList,
    faChartLine,
    faUserGraduate,
    faGear,
    faUserShield
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import './MobileNav.css';

const MobileNav = () => {
    const { isAdmin, isSchool } = useAuth();

    // Only show 4 main items for mobile bottom nav
    const adminNavItems = [
        { path: '/admin', icon: faHouse, label: 'Home', exact: true },
        { path: '/admin/schools', icon: faSchool, label: 'Schools' },
        { path: '/admin/analytics', icon: faChartLine, label: 'Analytics' },
        { path: '/settings', icon: faGear, label: 'Settings' },
    ];

    const schoolNavItems = [
        { path: '/school', icon: faHouse, label: 'Home', exact: true },
        { path: '/school/students', icon: faUserGraduate, label: 'Students' },
        { path: '/school/analytics', icon: faChartLine, label: 'Analytics' },
        { path: '/settings', icon: faGear, label: 'Settings' },
    ];

    const navItems = isAdmin ? adminNavItems : isSchool ? schoolNavItems : [];

    if (navItems.length === 0) return null;

    return (
        <nav className="mobile-nav">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                    end={item.exact}
                >
                    <motion.div
                        className="mobile-nav-content"
                        whileTap={{ scale: 0.95 }}
                    >
                        <FontAwesomeIcon icon={item.icon} className="mobile-nav-icon" />
                        <span className="mobile-nav-label">{item.label}</span>
                    </motion.div>
                </NavLink>
            ))}
        </nav>
    );
};

export default MobileNav;
