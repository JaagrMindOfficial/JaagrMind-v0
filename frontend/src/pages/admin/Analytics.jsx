import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartBar,
    faChartLine,
    faTriangleExclamation,
    faFileExport,
    faSchool,
    faUserGraduate,
    faClipboardCheck,
    faBrain,
    faHeart,
    faComments,
    faMobileScreen,
    faFilter,
    faGlobe,
    faRankingStar,
    faChartPie,
    faXmark,
    faFileAlt,
    faCalendar,
    faIdCard,
    faChevronDown,
    faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';
import './Analytics.css';

// Theme colors
const BUCKET_COLORS = {
    'Skill Stable': '#10B981',
    'Skill Emerging': '#F59E0B',
    'Skill Support Needed': '#EF4444'
};

const SKILL_COLORS = {
    A: '#8B5CF6',
    B: '#EC4899',
    C: '#06B6D4',
    D: '#10B981'
};

const SKILL_NAMES = {
    A: 'Focus & Attention',
    B: 'Self-Esteem',
    C: 'Social Interaction',
    D: 'Digital Hygiene'
};

const SKILL_AREAS = [
    { key: 'A', name: 'Focus & Attention', icon: faBrain, color: '#8B5CF6' },
    { key: 'B', name: 'Self-Esteem & Confidence', icon: faHeart, color: '#EC4899' },
    { key: 'C', name: 'Social Interaction', icon: faComments, color: '#06B6D4' },
    { key: 'D', name: 'Digital Hygiene', icon: faMobileScreen, color: '#10B981' }
];

const Analytics = () => {
    const toast = useToast();
    const [data, setData] = useState(null);
    const [schools, setSchools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [filters, setFilters] = useState({
        schoolId: '',
        startDate: '',
        endDate: '',
        bucket: '',
        className: ''
    });

    // Student detail modal state
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetail, setStudentDetail] = useState(null);
    const [studentDetailLoading, setStudentDetailLoading] = useState(false);
    const [expandedSubmission, setExpandedSubmission] = useState(null);

    useEffect(() => {
        fetchSchools();
        fetchAnalytics();
    }, []);

    const fetchSchools = async () => {
        try {
            const response = await api.get('/api/admin/schools');
            // Handle paginated response { data: [...], pagination: {...} }
            setSchools(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.schoolId) params.append('schoolId', filters.schoolId);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.bucket) params.append('bucket', filters.bucket);
            if (filters.className) params.append('className', filters.className);

            const response = await api.get(`/api/admin/analytics?${params}`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentDetail = async (studentId) => {
        setStudentDetailLoading(true);
        try {
            const response = await api.get(`/api/admin/student/${studentId}/details`);
            setStudentDetail(response.data);
            setExpandedSubmission(response.data.submissions?.[0]?._id || null);
        } catch (error) {
            console.error('Error fetching student details:', error);
            toast.error('Error loading student details');
        } finally {
            setStudentDetailLoading(false);
        }
    };

    const handleStudentClick = (studentId, studentName) => {
        setSelectedStudent({ id: studentId, name: studentName });
        fetchStudentDetail(studentId);
    };

    const closeStudentDetail = () => {
        setSelectedStudent(null);
        setStudentDetail(null);
        setExpandedSubmission(null);
    };

    const getBucketFromScore = (score) => {
        if (score >= 8 && score <= 14) return 'Thriving';
        if (score >= 15 && score <= 22) return 'Growing';
        if (score >= 23 && score <= 32) return 'Needs Support';
        return 'Unknown';
    };

    const handleExport = async () => {
        try {
            const params = new URLSearchParams();
            if (filters.schoolId) params.append('schoolId', filters.schoolId);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.bucket) params.append('bucket', filters.bucket);

            const response = await api.get(`/api/admin/export?${params}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'jaagrmind-analytics.xlsx');
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Export downloaded successfully');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Error exporting data');
        }
    };

    const applyFilters = () => {
        fetchAnalytics();
    };

    const clearFilters = () => {
        setFilters({
            schoolId: '',
            startDate: '',
            endDate: '',
            bucket: '',
            className: ''
        });
        setTimeout(fetchAnalytics, 100);
    };

    // Prepare chart data
    const bucketData = data?.bucketDistribution
        ? Object.entries(data.bucketDistribution).map(([name, value]) => ({
            name: name.replace('Skill ', ''),
            value,
            color: BUCKET_COLORS[name] || '#6B7280'
        }))
        : [];

    const schoolBarData = data?.schoolBreakdown
        ? Object.entries(data.schoolBreakdown)
            .map(([name, stats]) => ({
                name: name.length > 12 ? name.substring(0, 12) + '...' : name,
                fullName: name,
                total: stats.total,
                avgScore: stats.avgScore || 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
        : [];

    const classBarData = data?.classBreakdown
        ? Object.entries(data.classBreakdown)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, stats]) => ({
                name,
                total: stats.total,
                avgScore: stats.avgScore
            }))
        : [];

    const skillAreaData = data?.sectionAverages
        ? Object.entries(data.sectionAverages).map(([key, value]) => ({
            name: SKILL_NAMES[key] || key,
            shortName: SKILL_NAMES[key]?.split(' ')[0] || key,
            score: value,
            fill: SKILL_COLORS[key] || '#8B5CF6'
        }))
        : [];

    const schoolRankingData = data?.schoolBreakdown
        ? Object.entries(data.schoolBreakdown)
            .map(([name, stats]) => ({
                name,
                submissions: stats.total,
                avgScore: stats.avgScore || 0,
                health: stats.avgScore < 50 ? 'Healthy' : stats.avgScore < 70 ? 'Moderate' : 'Needs Attention'
            }))
            .sort((a, b) => a.avgScore - b.avgScore)
        : [];

    const uniqueClasses = data?.classBreakdown
        ? Object.keys(data.classBreakdown).sort()
        : [];

    const totalSchools = schools.length;
    const activeSchools = data?.schoolBreakdown ? Object.keys(data.schoolBreakdown).length : 0;

    return (
        <Layout title="Platform Analytics" subtitle="National overview and insights">
            {/* Tabs */}
            <div className="analytics-tabs" style={{ marginBottom: '24px' }}>
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <FontAwesomeIcon icon={faGlobe} /> National Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'schools' ? 'active' : ''}`}
                    onClick={() => setActiveTab('schools')}
                >
                    <FontAwesomeIcon icon={faSchool} /> School Insights
                </button>
                <button
                    className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
                    onClick={() => setActiveTab('skills')}
                >
                    <FontAwesomeIcon icon={faBrain} /> Skill Analysis
                </button>
                <button
                    className={`tab-btn ${activeTab === 'data' ? 'active' : ''}`}
                    onClick={() => setActiveTab('data')}
                >
                    <FontAwesomeIcon icon={faChartBar} /> Data & Export
                </button>
            </div>

            {/* Filters */}
            <motion.div
                className="filter-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="filter-bar">
                    <FontAwesomeIcon icon={faFilter} style={{ color: 'var(--primary-purple)' }} />
                    <select
                        className="form-input"
                        value={filters.schoolId}
                        onChange={(e) => setFilters({ ...filters, schoolId: e.target.value })}
                    >
                        <option value="">All Schools</option>
                        {schools.map(school => (
                            <option key={school._id} value={school._id}>{school.name}</option>
                        ))}
                    </select>

                    <select
                        className="form-input"
                        value={filters.className}
                        onChange={(e) => setFilters({ ...filters, className: e.target.value })}
                    >
                        <option value="">All Classes</option>
                        {uniqueClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        className="form-input"
                        value={filters.startDate}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    />

                    <input
                        type="date"
                        className="form-input"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    />

                    <select
                        className="form-input"
                        value={filters.bucket}
                        onChange={(e) => setFilters({ ...filters, bucket: e.target.value })}
                    >
                        <option value="">All Buckets</option>
                        <option value="Skill Stable">Stable (Thriving)</option>
                        <option value="Skill Emerging">Emerging (Growing)</option>
                        <option value="Skill Support Needed">Support Needed</option>
                    </select>
                </div>

                <div className="filter-actions">
                    <motion.button
                        className="btn btn-primary btn-sm"
                        onClick={applyFilters}
                        whileHover={{ scale: 1.02 }}
                    >
                        Apply Filters
                    </motion.button>
                    <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                        Clear
                    </button>
                    <motion.button
                        className="btn btn-secondary btn-sm"
                        onClick={handleExport}
                        whileHover={{ scale: 1.02 }}
                    >
                        <FontAwesomeIcon icon={faFileExport} /> Export Excel
                    </motion.button>
                </div>
            </motion.div>

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading analytics...</p>
                </div>
            ) : (
                <>
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <>
                            <div className="analytics-stats">
                                <motion.div className="stat-card stat-card-large" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                                        <FontAwesomeIcon icon={faSchool} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-value">{activeSchools}</div>
                                        <div className="stat-label">Active Schools</div>
                                        <div className="stat-sub">of {totalSchools} total</div>
                                    </div>
                                </motion.div>

                                <motion.div className="stat-card stat-card-large" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
                                        <FontAwesomeIcon icon={faClipboardCheck} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-value">{data?.totalSubmissions || 0}</div>
                                        <div className="stat-label">Total Assessments</div>
                                        <div className="stat-sub">completed</div>
                                    </div>
                                </motion.div>

                                <motion.div className="stat-card stat-card-large" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                        <FontAwesomeIcon icon={faChartLine} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-value">{data?.avgScore || 0}</div>
                                        <div className="stat-label">National Avg Score</div>
                                        <div className="stat-sub">across all students</div>
                                    </div>
                                </motion.div>

                                <motion.div className="stat-card stat-card-large" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                                        <FontAwesomeIcon icon={faTriangleExclamation} />
                                    </div>
                                    <div className="stat-content">
                                        <div className="stat-value">{data?.bucketDistribution?.['Skill Support Needed'] || 0}</div>
                                        <div className="stat-label">Need Support</div>
                                        <div className="stat-sub">students flagged</div>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="charts-grid">
                                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                                    <h3 className="chart-title">
                                        <FontAwesomeIcon icon={faChartPie} style={{ marginRight: '8px', color: 'var(--primary-purple)' }} />
                                        National Skill Distribution
                                    </h3>
                                    {bucketData.length > 0 ? (
                                        <>
                                            <ResponsiveContainer width="100%" height={280}>
                                                <PieChart>
                                                    <Pie data={bucketData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                                                        {bucketData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(value) => [`${value} students`, '']} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="chart-legend">
                                                {bucketData.map((item, idx) => (
                                                    <div key={idx} className="legend-item">
                                                        <span className="legend-dot" style={{ background: item.color }}></span>
                                                        <span>{item.name}: {item.value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="chart-empty">No data available</div>
                                    )}
                                </motion.div>

                                <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                                    <h3 className="chart-title">
                                        <FontAwesomeIcon icon={faSchool} style={{ marginRight: '8px', color: 'var(--primary-purple)' }} />
                                        Top Schools by Assessments
                                    </h3>
                                    {schoolBarData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={schoolBarData} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={true} vertical={false} />
                                                <XAxis type="number" />
                                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                                                <Tooltip formatter={(value, name, props) => [`${value}`, props.payload.fullName]} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                                <Bar dataKey="total" fill="#8B5CF6" radius={[0, 8, 8, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="chart-empty">No data available</div>
                                    )}
                                </motion.div>
                            </div>
                        </>
                    )}

                    {/* Schools Tab */}
                    {activeTab === 'schools' && (
                        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <h3 className="card-title mb-4">
                                <FontAwesomeIcon icon={faRankingStar} style={{ marginRight: '8px', color: 'var(--primary-purple)' }} />
                                School Performance Ranking
                            </h3>
                            {schoolRankingData.length > 0 ? (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Rank</th>
                                                <th>School Name</th>
                                                <th>Assessments</th>
                                                <th>Avg Score</th>
                                                <th>Health Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schoolRankingData.map((school, index) => (
                                                <tr key={school.name}>
                                                    <td><span className={`rank-badge ${index < 3 ? 'top-3' : ''}`}>{index + 1}</span></td>
                                                    <td className="font-medium">{school.name}</td>
                                                    <td>{school.submissions}</td>
                                                    <td><strong>{school.avgScore}</strong></td>
                                                    <td>
                                                        <span className={`badge ${school.health === 'Healthy' ? 'badge-success' : school.health === 'Moderate' ? 'badge-warning' : 'badge-danger'}`}>
                                                            {school.health}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state"><p>No school data available</p></div>
                            )}
                        </motion.div>
                    )}

                    {/* Skills Tab */}
                    {activeTab === 'skills' && (
                        <>
                            <div className="grid grid-2 mb-6">
                                {skillAreaData.map((skill, index) => {
                                    const bucket = skill.score < 15 ? 'Thriving' : skill.score < 23 ? 'Growing' : 'Needs Support';
                                    const bucketColor = bucket === 'Thriving' ? '#10B981' : bucket === 'Growing' ? '#F59E0B' : '#EF4444';
                                    const skillArea = SKILL_AREAS.find(s => s.name.includes(skill.shortName));

                                    return (
                                        <motion.div key={skill.name} className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `linear-gradient(135deg, ${skill.fill}, ${skill.fill}dd)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem' }}>
                                                    <FontAwesomeIcon icon={skillArea?.icon || faBrain} />
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{skill.name}</h3>
                                                    <span className="badge" style={{ background: bucketColor, color: 'white', marginTop: '4px' }}>{bucket}</span>
                                                </div>
                                                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                                    <div style={{ fontSize: '2rem', fontWeight: 700, color: skill.fill }}>{skill.score}</div>
                                                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>National Avg</div>
                                                </div>
                                            </div>
                                            <div style={{ height: '8px', background: 'var(--primary-bg)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${Math.min((skill.score / 32) * 100, 100)}%`, background: `linear-gradient(90deg, ${skill.fill}, ${skill.fill}aa)`, borderRadius: '4px' }}></div>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                <span>8 (Stable)</span><span>22 (Emerging)</span><span>32 (Support)</span>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>

                            <motion.div className="chart-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                                <h3 className="chart-title">National Skill Comparison</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={skillAreaData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                        <XAxis dataKey="shortName" tick={{ fontSize: 11 }} />
                                        <YAxis domain={[0, 32]} />
                                        <Tooltip formatter={(value) => [`${value}`, 'National Avg']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                                            {skillAreaData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </motion.div>
                        </>
                    )}

                    {/* Data Tab */}
                    {activeTab === 'data' && (
                        <motion.div className="card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 className="card-title">Recent Assessments</h3>
                                <button className="btn btn-primary btn-sm" onClick={handleExport}>
                                    <FontAwesomeIcon icon={faFileExport} /> Export All Data
                                </button>
                            </div>

                            {data?.recentSubmissions?.length > 0 ? (
                                <div className="table-container">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Student</th>
                                                <th>School</th>
                                                <th>Class</th>
                                                <th>Score</th>
                                                <th>Focus</th>
                                                <th>Self-Esteem</th>
                                                <th>Social</th>
                                                <th>Digital</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.recentSubmissions.map((sub) => (
                                                <tr key={sub._id}>
                                                    <td>
                                                        <button
                                                            onClick={() => handleStudentClick(sub.studentId?._id, sub.studentId?.name)}
                                                            style={{ fontWeight: 500, color: 'var(--primary-purple)', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', padding: 0 }}
                                                        >
                                                            {sub.studentId?.name || 'N/A'}
                                                        </button>
                                                    </td>
                                                    <td>{sub.schoolId?.name || 'N/A'}</td>
                                                    <td>{sub.studentId?.class} {sub.studentId?.section}</td>
                                                    <td><strong>{sub.totalScore}</strong></td>
                                                    <td>{sub.sectionScores?.A || '-'}</td>
                                                    <td>{sub.sectionScores?.B || '-'}</td>
                                                    <td>{sub.sectionScores?.C || '-'}</td>
                                                    <td>{sub.sectionScores?.D || '-'}</td>
                                                    <td>
                                                        <span className={`badge ${sub.assignedBucket?.includes('Stable') ? 'badge-success' : sub.assignedBucket?.includes('Emerging') ? 'badge-warning' : 'badge-danger'}`}>
                                                            {sub.assignedBucket?.replace('Skill ', '')}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state"><p>No submissions yet</p></div>
                            )}
                        </motion.div>
                    )}
                </>
            )}

            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="modal-overlay" onClick={closeStudentDetail}>
                    <motion.div className="modal" style={{ width: '95%', maxWidth: '1000px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                        <div className="modal-header">
                            <h2><FontAwesomeIcon icon={faUserGraduate} style={{ marginRight: '12px' }} />{selectedStudent.name} - Detailed Report</h2>
                            <button className="modal-close" onClick={closeStudentDetail}><FontAwesomeIcon icon={faXmark} /></button>
                        </div>

                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {studentDetailLoading ? (
                                <div className="loading-container" style={{ padding: '60px' }}>
                                    <div className="spinner"></div>
                                    <p>Loading student details...</p>
                                </div>
                            ) : studentDetail ? (
                                <>
                                    {/* Student Info Card */}
                                    <div style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05))', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}><FontAwesomeIcon icon={faUserGraduate} style={{ marginRight: '6px' }} />Full Name</div>
                                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{studentDetail.student.name}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}><FontAwesomeIcon icon={faIdCard} style={{ marginRight: '6px' }} />Access ID</div>
                                                <code style={{ fontSize: '0.95rem' }}>{studentDetail.student.accessId}</code>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Class</div>
                                                <div style={{ fontWeight: 500 }}>{studentDetail.student.class} {studentDetail.student.section}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>School</div>
                                                <div style={{ fontWeight: 500 }}>{studentDetail.student.school?.name || 'N/A'}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}><FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: '6px' }} />Total Assessments</div>
                                                <div style={{ fontWeight: 600, color: 'var(--primary-purple)' }}>{studentDetail.totalSubmissions}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submissions */}
                                    {studentDetail.submissions.length > 0 ? (
                                        studentDetail.submissions.map((submission) => (
                                            <div key={submission._id} style={{ background: 'var(--primary-white)', borderRadius: '12px', marginBottom: '16px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                                                <div style={{ padding: '16px 20px', background: 'var(--primary-bg)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setExpandedSubmission(expandedSubmission === submission._id ? null : submission._id)}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <FontAwesomeIcon icon={faFileAlt} style={{ color: 'var(--primary-purple)' }} />
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{submission.assessmentTitle}</div>
                                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}><FontAwesomeIcon icon={faCalendar} style={{ marginRight: '6px' }} />{new Date(submission.submittedAt).toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-purple)' }}>{submission.totalScore}</div>
                                                            <span className={`badge ${submission.assignedBucket?.includes('Stable') ? 'badge-success' : submission.assignedBucket?.includes('Emerging') ? 'badge-warning' : 'badge-danger'}`}>
                                                                {submission.assignedBucket?.replace('Skill ', '')}
                                                            </span>
                                                        </div>
                                                        <FontAwesomeIcon icon={expandedSubmission === submission._id ? faChevronUp : faChevronDown} style={{ color: 'var(--text-muted)' }} />
                                                    </div>
                                                </div>

                                                {expandedSubmission === submission._id && (
                                                    <div style={{ padding: '20px' }}>
                                                        <h4 style={{ marginBottom: '16px', color: 'var(--primary-purple)' }}><FontAwesomeIcon icon={faBrain} style={{ marginRight: '8px' }} />Section-wise Scores</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                                            {SKILL_AREAS.map(skill => {
                                                                const score = submission.sectionScores?.[skill.key] || 0;
                                                                const bucket = getBucketFromScore(score);
                                                                return (
                                                                    <div key={skill.key} style={{ padding: '16px', background: 'var(--primary-bg)', borderRadius: '10px', border: `2px solid ${skill.color}22` }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                                            <FontAwesomeIcon icon={skill.icon} style={{ color: skill.color }} />
                                                                            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{skill.name}</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: skill.color }}>{score}</span>
                                                                            <span className="badge" style={{ background: bucket === 'Thriving' ? '#10B981' : bucket === 'Growing' ? '#F59E0B' : '#EF4444', color: 'white' }}>{bucket}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        <h4 style={{ marginBottom: '16px', color: 'var(--primary-purple)' }}><FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: '8px' }} />Question-wise Responses</h4>
                                                        {Object.entries(submission.answersBySection || {}).map(([sectionKey, sectionData]) => (
                                                            <div key={sectionKey} style={{ marginBottom: '20px' }}>
                                                                <div style={{ background: SKILL_AREAS.find(s => s.key === sectionKey)?.color || '#8B5CF6', color: 'white', padding: '10px 16px', borderRadius: '8px 8px 0 0', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                                                                    <span>{sectionData.sectionName}</span>
                                                                    <span>Score: {sectionData.totalScore}</span>
                                                                </div>
                                                                <div style={{ border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                                                                    {sectionData.answers.map((answer, aIdx) => (
                                                                        <div key={aIdx} style={{ padding: '12px 16px', borderBottom: aIdx < sectionData.answers.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                                            <span style={{ minWidth: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem' }}>Q{answer.questionIndex}</span>
                                                                            <div style={{ flex: 1 }}>
                                                                                <div style={{ marginBottom: '8px', fontSize: '0.95rem' }}>{answer.questionText}</div>
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                                                    {answer.options.map((opt, optIdx) => (
                                                                                        <span key={optIdx} style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', background: answer.selectedOption === optIdx ? 'var(--primary-purple)' : 'var(--primary-bg)', color: answer.selectedOption === optIdx ? 'white' : 'var(--text-dark)', border: answer.selectedOption === optIdx ? 'none' : '1px solid var(--border-color)' }}>
                                                                                            {typeof opt === 'object' ? opt.label : opt}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            <div style={{ padding: '4px 10px', borderRadius: '8px', background: answer.score <= 2 ? '#10B98122' : answer.score <= 3 ? '#F59E0B22' : '#EF444422', color: answer.score <= 2 ? '#10B981' : answer.score <= 3 ? '#F59E0B' : '#EF4444', fontWeight: 600, fontSize: '0.85rem' }}>+{answer.score}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        <div style={{ display: 'flex', gap: '20px', marginTop: '16px', padding: '16px', background: 'var(--primary-bg)', borderRadius: '10px' }}>
                                                            <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Time Taken</span><div style={{ fontWeight: 600 }}>{Math.round(submission.timeTaken / 60)} minutes</div></div>
                                                            {submission.moodCheck && (
                                                                <>
                                                                    <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Mood</span><div style={{ fontWeight: 500 }}>{submission.moodCheck.mood || '-'}</div></div>
                                                                    <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Sleep</span><div style={{ fontWeight: 500 }}>{submission.moodCheck.sleep || '-'}</div></div>
                                                                </>
                                                            )}
                                                            <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Inactivity Time</span><div style={{ fontWeight: 500 }}>{submission.totalInactivityTime || 0}s</div></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state"><p>No assessments completed by this student</p></div>
                                    )}
                                </>
                            ) : (
                                <div className="empty-state"><p>Could not load student details</p></div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={closeStudentDetail}>Close</button>
                        </div>
                    </motion.div>
                </div>
            )}

            <style>{`
                .analytics-tabs { display: flex; gap: 8px; background: var(--primary-white); padding: 8px; border-radius: 12px; box-shadow: var(--shadow-sm); }
                .tab-btn { flex: 1; padding: 12px 20px; border: none; background: transparent; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); }
                .tab-btn:hover { background: var(--primary-bg); color: var(--text-dark); }
                .tab-btn.active { background: var(--gradient-purple); color: white; }
                .stat-card-large { display: flex; align-items: center; gap: 16px; }
                .stat-card-large .stat-icon { width: 64px; height: 64px; font-size: 1.5rem; }
                .stat-content { flex: 1; }
                .stat-sub { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
                .chart-legend { display: flex; justify-content: center; gap: 20px; margin-top: 16px; flex-wrap: wrap; }
                .legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; }
                .legend-dot { width: 10px; height: 10px; border-radius: 50%; }
                .rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: var(--primary-bg); font-weight: 600; font-size: 0.85rem; }
                .rank-badge.top-3 { background: linear-gradient(135deg, #F59E0B, #D97706); color: white; }
            `}</style>
        </Layout>
    );
};

export default Analytics;
