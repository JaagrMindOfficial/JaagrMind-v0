import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSchool, faUserGraduate, faClipboardList, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import api from '../../services/api';
import './AdminDashboard.css';

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#B993E9'];

const AdminDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const response = await api.get('/api/admin/dashboard');
            setData(response.data);
        } catch (error) {
            console.error('Dashboard fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Layout title="Dashboard">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading dashboard...</p>
                </div>
            </Layout>
        );
    }

    // Prepare chart data
    const bucketData = data?.analytics?.bucketDistribution
        ? Object.entries(data.analytics.bucketDistribution).map(([name, value]) => ({
            name,
            value,
            color: name.includes('Stable') ? '#10B981' :
                name.includes('Emerging') ? '#F59E0B' : '#EF4444'
        }))
        : [];

    const sectionData = data?.analytics?.sectionAverages
        ? [
            { name: 'Focus & Attention', score: data.analytics.sectionAverages.A, fill: '#B993E9' },
            { name: 'Self-Esteem', score: data.analytics.sectionAverages.B, fill: '#D4BFFF' },
            { name: 'Social Confidence', score: data.analytics.sectionAverages.C, fill: '#9B6DD4' },
            { name: 'Digital Hygiene', score: data.analytics.sectionAverages.D, fill: '#C7A6F5' }
        ]
        : [];

    return (
        <Layout title="Admin Dashboard" subtitle="Overview of all schools and assessments">
            {/* Stats Cards */}
            <div className="stats-grid">
                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faSchool} /></div>
                    <div className="stat-value">{data?.overview?.totalSchools || 0}</div>
                    <div className="stat-label">Total Schools</div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faUserGraduate} /></div>
                    <div className="stat-value">{data?.overview?.totalStudents || 0}</div>
                    <div className="stat-label">Total Students</div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faClipboardList} /></div>
                    <div className="stat-value">{data?.overview?.totalAssessments || 0}</div>
                    <div className="stat-label">Assessments</div>
                </motion.div>

                <motion.div
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faCheckCircle} /></div>
                    <div className="stat-value">{data?.overview?.totalSubmissions || 0}</div>
                    <div className="stat-label">Submissions</div>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                {/* Bucket Distribution Pie Chart */}
                <motion.div
                    className="chart-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3 className="chart-title">Student Wellness Distribution</h3>
                    {bucketData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={bucketData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                >
                                    {bucketData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="chart-empty">
                            <p>No data available yet</p>
                        </div>
                    )}
                </motion.div>

                {/* Section Averages Bar Chart */}
                <motion.div
                    className="chart-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <h3 className="chart-title">Average Section Scores</h3>
                    {sectionData.length > 0 && sectionData.some(s => s.score > 0) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={sectionData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis domain={[0, 32]} />
                                <Tooltip />
                                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                                    {sectionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="chart-empty">
                            <p>No data available yet</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Recent Schools */}
            <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
            >
                <div className="card-header">
                    <h3 className="card-title">Recent Schools</h3>
                    <a href="/admin/schools" className="btn btn-secondary btn-sm">View All</a>
                </div>

                {data?.recentSchools?.length > 0 ? (
                    <div className="recent-schools">
                        {data.recentSchools.map((school, index) => (
                            <div key={school._id} className="school-item">
                                <div className="school-avatar">
                                    {school.logo ? (
                                        <img src={school.logo} alt={school.name} />
                                    ) : (
                                        <span>{school.name[0]}</span>
                                    )}
                                </div>
                                <div className="school-info">
                                    <div className="school-name">{school.name}</div>
                                    <div className="school-id">{school.schoolId}</div>
                                </div>
                                <div className="school-date">
                                    {new Date(school.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <p>No schools registered yet</p>
                        <a href="/admin/schools" className="btn btn-primary btn-sm mt-4">
                            Add School
                        </a>
                    </div>
                )}
            </motion.div>
        </Layout>
    );
};

export default AdminDashboard;
