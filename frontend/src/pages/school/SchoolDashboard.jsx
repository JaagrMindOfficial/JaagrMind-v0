import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserGraduate,
    faCheckCircle,
    faClock,
    faUserPlus,
    faFileImport,
    faLink,
    faFileExport,
    faPhone,
    faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './SchoolDashboard.css';

const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

const SchoolDashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await api.get('/api/school/dashboard');
            setData(response.data);
        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout title="School Dashboard">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading dashboard...</p>
                </div>
            </Layout>
        );
    }

    const completionPercentage = data?.stats?.totalStudents > 0
        ? Math.round((data.stats.completedTests / data.stats.totalStudents) * 100)
        : 0;

    return (
        <Layout
            title={`Welcome, ${data?.school?.name || 'School'}`}
            subtitle="School Dashboard Overview"
        >
            {/* School Branding */}
            <motion.div
                className="school-branding"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="school-logo-large">
                    {data?.school?.logo ? (
                        <img src={data.school.logo} alt={data.school.name} />
                    ) : (
                        <span>{data?.school?.name?.[0] || 'S'}</span>
                    )}
                </div>
                <div className="school-info-large">
                    <h2>{data?.school?.name}</h2>
                    <p className="school-id-badge">{data?.school?.schoolId}</p>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <div className="stats-grid-3">
                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faUserGraduate} /></div>
                    <div className="stat-value">{data?.stats?.totalStudents || 0}</div>
                    <div className="stat-label">Total Students</div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faCheckCircle} /></div>
                    <div className="stat-value">{data?.stats?.completedTests || 0}</div>
                    <div className="stat-label">Tests Completed</div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faClock} /></div>
                    <div className="stat-value">{data?.stats?.pendingTests || 0}</div>
                    <div className="stat-label">Pending Tests</div>
                </motion.div>
            </div>

            {/* Completion Progress */}
            <motion.div
                className="card completion-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <h3>Assessment Completion</h3>
                <div className="completion-progress">
                    <div className="progress-bar large">
                        <motion.div
                            className="progress-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${completionPercentage}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                        />
                    </div>
                    <span className="completion-percentage">{completionPercentage}%</span>
                </div>
                <p className="completion-text">
                    {data?.stats?.completedTests || 0} of {data?.stats?.totalStudents || 0} students have completed the assessment
                </p>
            </motion.div>

            {/* Quick Actions */}
            <motion.div
                className="quick-actions"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <h3>Quick Actions</h3>
                <div className="actions-grid">
                    <a href="/school/students" className="action-card">
                        <span className="action-icon"><FontAwesomeIcon icon={faUserPlus} /></span>
                        <span className="action-text">Add Students</span>
                    </a>
                    <a href="/school/students" className="action-card">
                        <span className="action-icon"><FontAwesomeIcon icon={faFileImport} /></span>
                        <span className="action-text">Import Excel</span>
                    </a>
                    <a href="/school/tests" className="action-card">
                        <span className="action-icon"><FontAwesomeIcon icon={faLink} /></span>
                        <span className="action-text">Get Test Link</span>
                    </a>
                    <a href="/school/students" className="action-card">
                        <span className="action-icon"><FontAwesomeIcon icon={faFileExport} /></span>
                        <span className="action-text">Export Access IDs</span>
                    </a>
                </div>
            </motion.div>

            {/* Class Distribution */}
            {data?.classStats?.length > 0 && (
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <div className="card-header">
                        <h3 className="card-title">Students by Class</h3>
                    </div>
                    <div className="class-grid">
                        {data.classStats.map((item, index) => (
                            <div key={index} className="class-item">
                                <div className="class-name">
                                    Class {item._id.class} {item._id.section && `- ${item._id.section}`}
                                </div>
                                <div className="class-count">{item.count} students</div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Contact Us */}
            <motion.div
                className="card contact-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
            >
                <h3 className="card-title"><FontAwesomeIcon icon={faPhone} /> Contact Us</h3>
                <p className="text-muted mb-4">Need help? Reach out to our support team</p>
                <div className="contact-info">
                    <div className="contact-item">
                        <span className="contact-icon"><FontAwesomeIcon icon={faEnvelope} /></span>
                        <div>
                            <div className="contact-label">Email Support</div>
                            <a href="mailto:saurabh@jaagr.com" className="contact-value">
                                saurabh@jaagr.com
                            </a>
                        </div>
                    </div>
                    <div className="contact-item">
                        <span className="contact-icon"><FontAwesomeIcon icon={faPhone} /></span>
                        <div>
                            <div className="contact-label">Phone Support</div>
                            <a href="tel:+918373922112" className="contact-value">
                                +91-8373922112
                            </a>
                        </div>
                    </div>
                </div>
            </motion.div>
        </Layout>
    );
};

export default SchoolDashboard;
