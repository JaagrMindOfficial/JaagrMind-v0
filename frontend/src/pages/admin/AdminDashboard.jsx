import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSchool, faUserGraduate, faClipboardList, faCheckCircle, faExclamationTriangle, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import Background3D from '../../components/common/Background3D';
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
                <Background3D />
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

    const trendData = data?.wellnessTrends || [];
    const attentionData = data?.attentionNeeded || [];

    return (
        <Layout title="Admin Dashboard" subtitle="Overview of all schools and check-ins">
            <Background3D />
            {/* Stats Cards */}
            <div className="stats-grid">
                <motion.div
                    className="stat-card glass-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.05, translateY: -5 }}
                    onHoverStart={() => navigator.vibrate && navigator.vibrate(30)}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faSchool} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{data?.overview?.totalSchools || 0}</div>
                        <div className="stat-label">Total Schools</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card glass-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.05, translateY: -5 }}
                    onHoverStart={() => navigator.vibrate && navigator.vibrate(30)}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faUserGraduate} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{data?.overview?.totalStudents || 0}</div>
                        <div className="stat-label">Total Students</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card glass-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ scale: 1.05, translateY: -5 }}
                    onHoverStart={() => navigator.vibrate && navigator.vibrate(30)}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faClipboardList} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{data?.overview?.totalAssessments || 0}</div>
                        <div className="stat-label">Check-ins</div>
                    </div>
                </motion.div>

                <motion.div
                    className="stat-card glass-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ scale: 1.05, translateY: -5 }}
                    onHoverStart={() => navigator.vibrate && navigator.vibrate(30)}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faCheckCircle} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{data?.overview?.totalSubmissions || 0}</div>
                        <div className="stat-label">Submissions</div>
                    </div>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="charts-grid">
                {/* 4 Donut Charts for Focus Areas */}
                <motion.div
                    className="chart-card glass-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <h3 className="chart-title">Focus Area Breakdown</h3>
                    <div className="four-chart-grid" style={{ height: 'auto', minHeight: '300px' }}>
                        {[
                            { key: 'A', title: 'Focus & Attention' },
                            { key: 'B', title: 'Self-Esteem' },
                            { key: 'C', title: 'Social Confidence' },
                            { key: 'D', title: 'Digital Hygiene' }
                        ].map((section) => {
                            const dist = data?.analytics?.sectionDistributions?.[section.key];
                            const chartData = [
                                { name: 'Stable', value: dist?.['Skill Stable'] || 0, color: '#10B981' },
                                { name: 'Emerging', value: dist?.['Skill Emerging'] || 0, color: '#F59E0B' },
                                { name: 'Support', value: dist?.['Skill Support Needed'] || 0, color: '#EF4444' }
                            ];
                            const total = chartData.reduce((sum, item) => sum + item.value, 0);

                            return (
                                <div key={section.key} className="mini-chart">
                                    <h4>{section.title}</h4>
                                    <div style={{ width: '100%', height: 160 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={chartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={55}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(value, name) => [`${value} students`, name]}
                                                    contentStyle={{ fontSize: '10px', padding: '5px' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="chart-center-text">
                                            {total} <span>Students</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* Bar Chart (Restored) */}
                <motion.div
                    className="chart-card glass-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <h3 className="chart-title">Average Focus Area Indices</h3>
                    {sectionData.length > 0 && sectionData.some(s => s.score > 0) ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={sectionData} barSize={40}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor="#B993E9" stopOpacity={0.8} />
                                        <stop offset="50%" stopColor="#9B6DD4" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#B993E9" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={[0, 32]}
                                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        backdropFilter: 'blur(10px)',
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                        color: '#1f2937'
                                    }}
                                    itemStyle={{ color: '#1f2937' }}
                                />
                                <Bar
                                    dataKey="score"
                                    radius={[10, 10, 10, 10]}
                                    fill="url(#barGradient)"
                                    animationDuration={1500}
                                    animationBegin={200}
                                >
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

            <div className="charts-row-secondary" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                {/* Wellness Trends Chart */}
                <motion.div
                    className="chart-card glass-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                >
                    <h3 className="chart-title">Well-being Trends (Last 6 Months)</h3>
                    {trendData.length > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                                    <YAxis domain={[0, 32]} axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            borderRadius: '8px',
                                            border: 'none',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            color: '#1f2937'
                                        }}
                                        itemStyle={{ color: '#1f2937' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#10B981"
                                        fillOpacity={1}
                                        fill="url(#colorScore)"
                                        strokeWidth={3}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="chart-empty">
                            <p>No trend data available yet</p>
                        </div>
                    )}
                </motion.div>

                {/* Pie Chart (Student Well-being) - Restored */}
                <motion.div
                    className="chart-card glass-panel"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                >
                    <h3 className="chart-title">Student Well-being Distribution</h3>
                    {bucketData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={bucketData}
                                    cx="50%"
                                    cy="45%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {bucketData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${value} students`, name]} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value, entry) => {
                                        const item = bucketData.find(d => d.name === value);
                                        const total = bucketData.reduce((sum, d) => sum + d.value, 0);
                                        const percent = total > 0 ? ((item?.value || 0) / total * 100).toFixed(0) : 0;
                                        return `${value} (${percent}%)`;
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="chart-empty">
                            <p>No data available yet</p>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Schools Needing Support - Full Width */}
            <motion.div
                className="charts-row-full chart-card glass-panel attention-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
            >
                <div className="card-header">
                    <h3 className="chart-title">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-warning me-2" />
                        Schools Needing Support
                    </h3>
                </div>

                {attentionData.length > 0 ? (
                    <div className="attention-list">
                        {attentionData.map((school, index) => (
                            <div key={school.id} className="attention-item">
                                <div className="attention-info">
                                    <h4>{school.name}</h4>
                                    <p>{school.details}</p>
                                </div>
                                <div className="attention-score">
                                    <div className="risk-badge">
                                        {school.riskScore}% Priority
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="attention-footer">
                            <a href="/admin/schools" className="btn-link">
                                View All Schools <FontAwesomeIcon icon={faArrowRight} />
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="empty-state">
                        <FontAwesomeIcon icon={faCheckCircle} className="text-success fa-3x mb-3" />
                        <p>All schools are performing well!</p>
                        <span className="text-muted text-sm">No priority schools detected.</span>
                    </div>
                )}
            </motion.div>
        </Layout>
    );
};

export default AdminDashboard;
