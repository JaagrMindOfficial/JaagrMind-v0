import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faChartBar,
    faChartLine,
    faStopwatch,
    faTriangleExclamation,
    faUsers,
    faBrain,
    faHeart,
    faComments,
    faMobileScreen,
    faFilter,
    faUserGraduate,
    faClipboardCheck,
    faXmark,
    faFileAlt,
    faCalendar,
    faIdCard,
    faChevronDown,
    faChevronUp,
    faCircleCheck,
    faCircleXmark
} from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

// Bucket colors matching theme
const BUCKET_COLORS = {
    'Skill Stable': '#10B981',
    'Skill Emerging': '#F59E0B',
    'Skill Support Needed': '#EF4444',
    'Thriving': '#10B981',
    'Growing': '#8B5CF6',
    'Emerging': '#F59E0B',
    'Needs Support': '#EF4444'
};

// Skill area configurations
const SKILL_AREAS = [
    { key: 'A', name: 'Focus & Attention', icon: faBrain, color: '#8B5CF6' },
    { key: 'B', name: 'Self-Esteem & Confidence', icon: faHeart, color: '#EC4899' },
    { key: 'C', name: 'Social Interaction', icon: faComments, color: '#06B6D4' },
    { key: 'D', name: 'Digital Hygiene', icon: faMobileScreen, color: '#10B981' }
];

const SchoolAnalytics = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [classes, setClasses] = useState([]);
    const [uniqueClasses, setUniqueClasses] = useState([]);
    const [filters, setFilters] = useState({ class: '', section: '' });
    const [activeTab, setActiveTab] = useState('overview');

    // Student details view
    const [studentsData, setStudentsData] = useState(null);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentFilters, setStudentFilters] = useState({ class: '', section: '', assessmentId: '', search: '' });

    // Student detail modal
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetail, setStudentDetail] = useState(null);
    const [studentDetailLoading, setStudentDetailLoading] = useState(false);
    const [expandedSubmission, setExpandedSubmission] = useState(null);

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [filters]);

    const fetchClasses = async () => {
        try {
            const response = await api.get('/api/school/classes');
            setClasses(response.data.classes || []);
            setUniqueClasses(response.data.uniqueClasses || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.class) params.append('class', filters.class);
            if (filters.section) params.append('section', filters.section);

            const response = await api.get(`/api/school/analytics?${params.toString()}`);
            setData(response.data);
            setError(null);
        } catch (error) {
            if (error.response?.status === 403) {
                setError('Analytics not available for your school. Please contact admin.');
            } else {
                setError('Error loading analytics');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentsData = async (appliedFilters = studentFilters) => {
        setStudentsLoading(true);
        try {
            const params = new URLSearchParams();
            if (appliedFilters.class) params.append('class', appliedFilters.class);
            if (appliedFilters.section) params.append('section', appliedFilters.section);
            if (appliedFilters.assessmentId) params.append('assessmentId', appliedFilters.assessmentId);
            if (appliedFilters.search) params.append('search', appliedFilters.search);

            const response = await api.get(`/api/school/students-analytics?${params.toString()}`);
            setStudentsData(response.data);
        } catch (error) {
            console.error('Error fetching students data:', error);
        } finally {
            setStudentsLoading(false);
        }
    };

    const fetchStudentDetail = async (studentId) => {
        setStudentDetailLoading(true);
        try {
            const response = await api.get(`/api/school/student/${studentId}/details`);
            setStudentDetail(response.data);
            setExpandedSubmission(response.data.submissions?.[0]?._id || null);
        } catch (error) {
            console.error('Error fetching student details:', error);
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

    const handleStudentFilterChange = (key, value) => {
        const newFilters = { ...studentFilters, [key]: value };
        if (key === 'class') newFilters.section = '';
        setStudentFilters(newFilters);
        fetchStudentsData(newFilters);
    };

    const getSectionsForClass = (className) => {
        if (!className) return [];
        return classes
            .filter(c => c._id.class === className)
            .map(c => c._id.section)
            .filter(Boolean);
    };

    const handleClassChange = (e) => {
        setFilters({ class: e.target.value, section: '' });
    };

    const handleSectionChange = (e) => {
        setFilters({ ...filters, section: e.target.value });
    };

    const clearFilters = () => {
        setFilters({ class: '', section: '' });
    };

    // Calculate skill area data for bar chart
    const getSkillAreaData = () => {
        if (!data?.sectionAverages) return [];
        return SKILL_AREAS.map(skill => ({
            name: skill.name.split(' ')[0],
            fullName: skill.name,
            score: data.sectionAverages[skill.key] || 0,
            fill: skill.color,
            icon: skill.icon
        }));
    };

    // Get bucket for score
    const getBucketFromScore = (score) => {
        if (score >= 8 && score <= 14) return 'Thriving';
        if (score >= 15 && score <= 22) return 'Growing';
        if (score >= 23 && score <= 32) return 'Needs Support';
        return 'Unknown';
    };

    if (loading && !data) {
        return (
            <Layout title="Analytics">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout title="Analytics">
                <motion.div
                    className="card text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '60px 24px' }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.5 }}>🔒</div>
                    <h3 style={{ marginBottom: '8px' }}>Analytics Restricted</h3>
                    <p className="text-muted">{error}</p>
                </motion.div>
            </Layout>
        );
    }

    const bucketData = data?.bucketDistribution
        ? Object.entries(data.bucketDistribution).map(([name, value]) => ({
            name: name.replace('Skill ', ''),
            value,
            color: BUCKET_COLORS[name] || '#6B7280'
        }))
        : [];

    const skillAreaData = getSkillAreaData();

    return (
        <Layout title="School Analytics" subtitle="Student skill assessment insights">
            {/* Tabs */}
            <div className="analytics-tabs" style={{ marginBottom: '24px' }}>
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <FontAwesomeIcon icon={faChartBar} /> Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
                    onClick={() => setActiveTab('skills')}
                >
                    <FontAwesomeIcon icon={faBrain} /> Skill Areas
                </button>
                <button
                    className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('students'); fetchStudentsData({}); }}
                >
                    <FontAwesomeIcon icon={faUsers} /> Students
                </button>
            </div>

            {/* Filters */}
            <motion.div
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: '24px', padding: '16px 24px' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <FontAwesomeIcon icon={faFilter} style={{ color: 'var(--primary-purple)' }} />
                    <select
                        className="form-input"
                        value={filters.class}
                        onChange={handleClassChange}
                        style={{ width: 'auto', minWidth: '150px' }}
                    >
                        <option value="">All Classes</option>
                        {uniqueClasses.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        className="form-input"
                        value={filters.section}
                        onChange={handleSectionChange}
                        style={{ width: 'auto', minWidth: '150px' }}
                        disabled={!filters.class}
                    >
                        <option value="">All Sections</option>
                        {getSectionsForClass(filters.class).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                    {(filters.class || filters.section) && (
                        <button className="btn btn-outline btn-sm" onClick={clearFilters}>
                            Clear Filters
                        </button>
                    )}
                </div>
            </motion.div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-4 mb-6">
                        <motion.div
                            className="stat-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                                <FontAwesomeIcon icon={faClipboardCheck} />
                            </div>
                            <div className="stat-value">{data?.totalSubmissions || 0}</div>
                            <div className="stat-label">Total Assessments</div>
                        </motion.div>

                        <motion.div
                            className="stat-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
                                <FontAwesomeIcon icon={faChartLine} />
                            </div>
                            <div className="stat-value">{data?.avgScore || 0}</div>
                            <div className="stat-label">Avg Skill Score</div>
                        </motion.div>

                        <motion.div
                            className="stat-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                <FontAwesomeIcon icon={faStopwatch} />
                            </div>
                            <div className="stat-value">{Math.round((data?.avgTimeTaken || 0) / 60)}m</div>
                            <div className="stat-label">Avg Time Taken</div>
                        </motion.div>

                        <motion.div
                            className="stat-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                            </div>
                            <div className="stat-value">
                                {data?.bucketDistribution?.['Skill Support Needed'] || 0}
                            </div>
                            <div className="stat-label">Need Support</div>
                        </motion.div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-2 mb-6">
                        {/* Bucket Distribution Donut */}
                        <motion.div
                            className="card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <h3 className="card-title mb-4">
                                <FontAwesomeIcon icon={faChartBar} style={{ marginRight: '8px', color: 'var(--primary-purple)' }} />
                                Skill Bucket Distribution
                            </h3>
                            {bucketData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={bucketData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={3}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        >
                                            {bucketData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value, name) => [`${value} students`, name]} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-state">
                                    <p>No assessment data available yet</p>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10B981' }}></span>
                                    <span style={{ fontSize: '0.85rem' }}>Stable</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F59E0B' }}></span>
                                    <span style={{ fontSize: '0.85rem' }}>Emerging</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#EF4444' }}></span>
                                    <span style={{ fontSize: '0.85rem' }}>Support Needed</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Skill Area Breakdown */}
                        <motion.div
                            className="card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <h3 className="card-title mb-4">
                                <FontAwesomeIcon icon={faBrain} style={{ marginRight: '8px', color: 'var(--primary-purple)' }} />
                                Skill Area Averages
                            </h3>
                            {skillAreaData.length > 0 && skillAreaData.some(s => s.score > 0) ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={skillAreaData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={true} vertical={false} />
                                        <XAxis type="number" domain={[0, 32]} tick={{ fontSize: 11 }} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                                        <Tooltip
                                            formatter={(value, name, props) => [`Score: ${value}`, props.payload.fullName]}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="score" radius={[0, 8, 8, 0]}>
                                            {skillAreaData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-state">
                                    <p>No skill data available yet</p>
                                </div>
                            )}
                            <p className="text-muted text-center" style={{ fontSize: '0.8rem', marginTop: '12px' }}>
                                Lower scores = stronger skills (8-14: Stable, 15-22: Emerging, 23-32: Needs Support)
                            </p>
                        </motion.div>
                    </div>

                    {/* Recent Submissions */}
                    <motion.div
                        className="card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                    >
                        <h3 className="card-title mb-4">
                            <FontAwesomeIcon icon={faUserGraduate} style={{ marginRight: '8px', color: 'var(--primary-purple)' }} />
                            Recent Assessments
                        </h3>
                        {data?.recentSubmissions?.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Student</th>
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
                                        {data.recentSubmissions.slice(0, 10).map((sub) => (
                                            <tr key={sub._id}>
                                                <td>
                                                    <button
                                                        className="link-button"
                                                        onClick={() => handleStudentClick(sub.studentId?._id, sub.studentId?.name)}
                                                        style={{ fontWeight: 500, color: 'var(--primary-purple)', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left' }}
                                                    >
                                                        {sub.studentId?.name || 'N/A'}
                                                    </button>
                                                </td>
                                                <td>{sub.studentId?.class} {sub.studentId?.section}</td>
                                                <td><strong>{sub.totalScore}</strong></td>
                                                <td>{sub.sectionScores?.A || '-'}</td>
                                                <td>{sub.sectionScores?.B || '-'}</td>
                                                <td>{sub.sectionScores?.C || '-'}</td>
                                                <td>{sub.sectionScores?.D || '-'}</td>
                                                <td>
                                                    <span className={`badge ${sub.assignedBucket?.includes('Stable') ? 'badge-success' :
                                                        sub.assignedBucket?.includes('Emerging') ? 'badge-warning' : 'badge-danger'
                                                        }`}>
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
                            <div className="empty-state">
                                <p>No assessments completed yet</p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}

            {/* Skills Tab */}
            {activeTab === 'skills' && (
                <>
                    <div className="grid grid-2 mb-6">
                        {SKILL_AREAS.map((skill, index) => {
                            const score = data?.sectionAverages?.[skill.key] || 0;
                            const bucket = getBucketFromScore(score);
                            const bucketColor = bucket === 'Thriving' ? '#10B981' : bucket === 'Growing' ? '#F59E0B' : '#EF4444';

                            return (
                                <motion.div
                                    key={skill.key}
                                    className="card"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                        <div style={{
                                            width: '56px',
                                            height: '56px',
                                            borderRadius: '16px',
                                            background: `linear-gradient(135deg, ${skill.color}, ${skill.color}dd)`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontSize: '1.5rem'
                                        }}>
                                            <FontAwesomeIcon icon={skill.icon} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{skill.name}</h3>
                                            <span className="badge" style={{ background: bucketColor, color: 'white', marginTop: '4px' }}>
                                                {bucket}
                                            </span>
                                        </div>
                                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                            <div style={{ fontSize: '2rem', fontWeight: 700, color: skill.color }}>{score}</div>
                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>Avg Score</div>
                                        </div>
                                    </div>

                                    <div style={{
                                        height: '8px',
                                        background: 'var(--primary-bg)',
                                        borderRadius: '4px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${Math.min((score / 32) * 100, 100)}%`,
                                            background: `linear-gradient(90deg, ${skill.color}, ${skill.color}aa)`,
                                            borderRadius: '4px',
                                            transition: 'width 0.5s ease'
                                        }}></div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <span>8 (Stable)</span>
                                        <span>22 (Emerging)</span>
                                        <span>32 (Support)</span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <motion.div
                        className="card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                    >
                        <h3 className="card-title mb-4">Skill Area Comparison</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={skillAreaData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis domain={[0, 32]} />
                                <Tooltip
                                    formatter={(value) => [`${value}`, 'Avg Score']}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
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

            {/* Students Tab */}
            {activeTab === 'students' && (
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 className="card-title" style={{ margin: 0 }}>
                            <FontAwesomeIcon icon={faUsers} style={{ marginRight: '8px' }} />
                            All Students ({studentsData?.totalStudents || 0})
                        </h3>
                    </div>

                    {/* Student Filters */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', padding: '16px', background: 'var(--primary-bg)', borderRadius: '12px' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search name or ID..."
                            value={studentFilters.search}
                            onChange={(e) => handleStudentFilterChange('search', e.target.value)}
                            style={{ maxWidth: '200px' }}
                        />
                        <select
                            className="form-input"
                            value={studentFilters.class}
                            onChange={(e) => handleStudentFilterChange('class', e.target.value)}
                            style={{ maxWidth: '150px' }}
                        >
                            <option value="">All Classes</option>
                            {studentsData?.filters?.classes?.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        {studentFilters.class && (
                            <select
                                className="form-input"
                                value={studentFilters.section}
                                onChange={(e) => handleStudentFilterChange('section', e.target.value)}
                                style={{ maxWidth: '150px' }}
                            >
                                <option value="">All Sections</option>
                                {studentsData?.filters?.sections?.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        )}
                        <select
                            className="form-input"
                            value={studentFilters.assessmentId}
                            onChange={(e) => handleStudentFilterChange('assessmentId', e.target.value)}
                            style={{ maxWidth: '200px' }}
                        >
                            <option value="">All Assessments</option>
                            {studentsData?.filters?.assessments?.map(a => (
                                <option key={a._id} value={a._id}>{a.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Students Table */}
                    {studentsLoading ? (
                        <div className="loading-container" style={{ padding: '40px' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : studentsData?.students?.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Access ID</th>
                                        <th>Class</th>
                                        <th>Roll No</th>
                                        <th>Assessment</th>
                                        <th>Score</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentsData.students.map(student => (
                                        student.submissions?.length > 0 ? (
                                            student.submissions.map((sub, idx) => (
                                                <tr key={`${student._id}-${idx}`}>
                                                    {idx === 0 && (
                                                        <>
                                                            <td rowSpan={student.submissions.length}>
                                                                <button
                                                                    onClick={() => handleStudentClick(student._id, student.name)}
                                                                    style={{
                                                                        fontWeight: 500,
                                                                        color: 'var(--primary-purple)',
                                                                        cursor: 'pointer',
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        textAlign: 'left',
                                                                        padding: 0
                                                                    }}
                                                                >
                                                                    {student.name}
                                                                </button>
                                                            </td>
                                                            <td rowSpan={student.submissions.length}><code style={{ fontSize: '0.8rem' }}>{student.accessId}</code></td>
                                                            <td rowSpan={student.submissions.length}>{student.class} {student.section}</td>
                                                            <td rowSpan={student.submissions.length}>{student.rollNo || '-'}</td>
                                                        </>
                                                    )}
                                                    <td>{sub.assessmentTitle}</td>
                                                    <td><strong>{sub.totalScore}</strong></td>
                                                    <td>
                                                        <span className={`badge ${sub.bucket?.includes('Stable') ? 'badge-success' :
                                                            sub.bucket?.includes('Emerging') ? 'badge-warning' : 'badge-danger'}`}>
                                                            {sub.bucket?.replace('Skill ', '')}
                                                        </span>
                                                    </td>
                                                    <td>{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr key={student._id}>
                                                <td>
                                                    <button
                                                        onClick={() => handleStudentClick(student._id, student.name)}
                                                        style={{
                                                            fontWeight: 500,
                                                            color: 'var(--primary-purple)',
                                                            cursor: 'pointer',
                                                            background: 'none',
                                                            border: 'none',
                                                            textAlign: 'left',
                                                            padding: 0
                                                        }}
                                                    >
                                                        {student.name}
                                                    </button>
                                                </td>
                                                <td><code style={{ fontSize: '0.8rem' }}>{student.accessId}</code></td>
                                                <td>{student.class} {student.section}</td>
                                                <td>{student.rollNo || '-'}</td>
                                                <td colSpan="4" className="text-muted">No assessments completed</td>
                                            </tr>
                                        )
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state">
                            <p>No students found</p>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="modal-overlay" onClick={closeStudentDetail}>
                    <motion.div
                        className="modal"
                        style={{ width: '95%', maxWidth: '1000px', maxHeight: '90vh' }}
                        onClick={e => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="modal-header">
                            <h2>
                                <FontAwesomeIcon icon={faUserGraduate} style={{ marginRight: '12px' }} />
                                {selectedStudent.name} - Detailed Report
                            </h2>
                            <button className="modal-close" onClick={closeStudentDetail}>
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
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
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05))',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        marginBottom: '24px',
                                        border: '1px solid rgba(139, 92, 246, 0.2)'
                                    }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                                                    <FontAwesomeIcon icon={faUserGraduate} style={{ marginRight: '6px' }} />
                                                    Full Name
                                                </div>
                                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{studentDetail.student.name}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                                                    <FontAwesomeIcon icon={faIdCard} style={{ marginRight: '6px' }} />
                                                    Access ID
                                                </div>
                                                <code style={{ fontSize: '0.95rem' }}>{studentDetail.student.accessId}</code>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Class</div>
                                                <div style={{ fontWeight: 500 }}>{studentDetail.student.class} {studentDetail.student.section}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Roll No</div>
                                                <div>{studentDetail.student.rollNo || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                                                    <FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: '6px' }} />
                                                    Total Assessments
                                                </div>
                                                <div style={{ fontWeight: 600, color: 'var(--primary-purple)' }}>{studentDetail.totalSubmissions}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Submissions */}
                                    {studentDetail.submissions.length > 0 ? (
                                        studentDetail.submissions.map((submission, subIdx) => (
                                            <div key={submission._id} style={{
                                                background: 'var(--primary-white)',
                                                borderRadius: '12px',
                                                marginBottom: '16px',
                                                border: '1px solid var(--border-color)',
                                                overflow: 'hidden'
                                            }}>
                                                {/* Submission Header */}
                                                <div
                                                    style={{
                                                        padding: '16px 20px',
                                                        background: 'var(--primary-bg)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}
                                                    onClick={() => setExpandedSubmission(expandedSubmission === submission._id ? null : submission._id)}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <FontAwesomeIcon icon={faFileAlt} style={{ color: 'var(--primary-purple)' }} />
                                                        <div>
                                                            <div style={{ fontWeight: 600 }}>{submission.assessmentTitle}</div>
                                                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                                <FontAwesomeIcon icon={faCalendar} style={{ marginRight: '6px' }} />
                                                                {new Date(submission.submittedAt).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-purple)' }}>
                                                                {submission.totalScore}
                                                            </div>
                                                            <span className={`badge ${submission.assignedBucket?.includes('Stable') ? 'badge-success' :
                                                                submission.assignedBucket?.includes('Emerging') ? 'badge-warning' : 'badge-danger'}`}>
                                                                {submission.assignedBucket?.replace('Skill ', '')}
                                                            </span>
                                                        </div>
                                                        <FontAwesomeIcon
                                                            icon={expandedSubmission === submission._id ? faChevronUp : faChevronDown}
                                                            style={{ color: 'var(--text-muted)' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {expandedSubmission === submission._id && (
                                                    <div style={{ padding: '20px' }}>
                                                        {/* Section Scores */}
                                                        <h4 style={{ marginBottom: '16px', color: 'var(--primary-purple)' }}>
                                                            <FontAwesomeIcon icon={faBrain} style={{ marginRight: '8px' }} />
                                                            Section-wise Scores
                                                        </h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                                                            {SKILL_AREAS.map(skill => {
                                                                const score = submission.sectionScores?.[skill.key] || 0;
                                                                const bucket = getBucketFromScore(score);
                                                                return (
                                                                    <div key={skill.key} style={{
                                                                        padding: '16px',
                                                                        background: 'var(--primary-bg)',
                                                                        borderRadius: '10px',
                                                                        border: `2px solid ${skill.color}22`
                                                                    }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                                                            <FontAwesomeIcon icon={skill.icon} style={{ color: skill.color }} />
                                                                            <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{skill.name}</span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: skill.color }}>{score}</span>
                                                                            <span className="badge" style={{
                                                                                background: bucket === 'Thriving' ? '#10B981' : bucket === 'Growing' ? '#F59E0B' : '#EF4444',
                                                                                color: 'white'
                                                                            }}>
                                                                                {bucket}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Question-wise Answers */}
                                                        <h4 style={{ marginBottom: '16px', color: 'var(--primary-purple)' }}>
                                                            <FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: '8px' }} />
                                                            Question-wise Responses
                                                        </h4>
                                                        {Object.entries(submission.answersBySection || {}).map(([sectionKey, sectionData]) => (
                                                            <div key={sectionKey} style={{ marginBottom: '20px' }}>
                                                                <div style={{
                                                                    background: SKILL_AREAS.find(s => s.key === sectionKey)?.color || '#8B5CF6',
                                                                    color: 'white',
                                                                    padding: '10px 16px',
                                                                    borderRadius: '8px 8px 0 0',
                                                                    fontWeight: 600,
                                                                    display: 'flex',
                                                                    justifyContent: 'space-between'
                                                                }}>
                                                                    <span>{sectionData.sectionName}</span>
                                                                    <span>Score: {sectionData.totalScore}</span>
                                                                </div>
                                                                <div style={{ border: '1px solid var(--border-color)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                                                                    {sectionData.answers.map((answer, aIdx) => (
                                                                        <div key={aIdx} style={{
                                                                            padding: '12px 16px',
                                                                            borderBottom: aIdx < sectionData.answers.length - 1 ? '1px solid var(--border-color)' : 'none',
                                                                            display: 'flex',
                                                                            gap: '12px',
                                                                            alignItems: 'flex-start'
                                                                        }}>
                                                                            <span style={{
                                                                                minWidth: '28px',
                                                                                height: '28px',
                                                                                borderRadius: '50%',
                                                                                background: 'var(--primary-bg)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontWeight: 600,
                                                                                fontSize: '0.8rem'
                                                                            }}>
                                                                                Q{answer.questionIndex}
                                                                            </span>
                                                                            <div style={{ flex: 1 }}>
                                                                                <div style={{ marginBottom: '8px', fontSize: '0.95rem' }}>
                                                                                    {answer.questionText}
                                                                                </div>
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                                                    {answer.options.map((opt, optIdx) => (
                                                                                        <span key={optIdx} style={{
                                                                                            padding: '4px 12px',
                                                                                            borderRadius: '16px',
                                                                                            fontSize: '0.85rem',
                                                                                            background: answer.selectedOption === optIdx
                                                                                                ? 'var(--primary-purple)'
                                                                                                : 'var(--primary-bg)',
                                                                                            color: answer.selectedOption === optIdx
                                                                                                ? 'white'
                                                                                                : 'var(--text-dark)',
                                                                                            border: answer.selectedOption === optIdx
                                                                                                ? 'none'
                                                                                                : '1px solid var(--border-color)'
                                                                                        }}>
                                                                                            {typeof opt === 'object' ? opt.label : opt}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                            <div style={{
                                                                                padding: '4px 10px',
                                                                                borderRadius: '8px',
                                                                                background: answer.score <= 2 ? '#10B98122' : answer.score <= 3 ? '#F59E0B22' : '#EF444422',
                                                                                color: answer.score <= 2 ? '#10B981' : answer.score <= 3 ? '#F59E0B' : '#EF4444',
                                                                                fontWeight: 600,
                                                                                fontSize: '0.85rem'
                                                                            }}>
                                                                                +{answer.score}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}

                                                        {/* Mood & Time Info */}
                                                        <div style={{ display: 'flex', gap: '20px', marginTop: '16px', padding: '16px', background: 'var(--primary-bg)', borderRadius: '10px' }}>
                                                            <div>
                                                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Time Taken</span>
                                                                <div style={{ fontWeight: 600 }}>{Math.round(submission.timeTaken / 60)} minutes</div>
                                                            </div>
                                                            {submission.moodCheck && (
                                                                <>
                                                                    <div>
                                                                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Mood Before</span>
                                                                        <div style={{ fontWeight: 500 }}>{submission.moodCheck.before || '-'}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Mood After</span>
                                                                        <div style={{ fontWeight: 500 }}>{submission.moodCheck.after || '-'}</div>
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div>
                                                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Inactivity Time</span>
                                                                <div style={{ fontWeight: 500 }}>{submission.totalInactivityTime || 0}s</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-state">
                                            <p>No assessments completed by this student</p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="empty-state">
                                    <p>Could not load student details</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn btn-outline" onClick={closeStudentDetail}>
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Add CSS for tabs */}
            <style>{`
                .analytics-tabs {
                    display: flex;
                    gap: 8px;
                    background: var(--primary-white);
                    padding: 8px;
                    border-radius: 12px;
                    box-shadow: var(--shadow-sm);
                }
                .tab-btn {
                    flex: 1;
                    padding: 12px 20px;
                    border: none;
                    background: transparent;
                    border-radius: 8px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    color: var(--text-muted);
                }
                .tab-btn:hover {
                    background: var(--primary-bg);
                    color: var(--text-dark);
                }
                .tab-btn.active {
                    background: var(--gradient-purple);
                    color: white;
                }
                .link-button:hover {
                    text-decoration: underline;
                }
            `}</style>
        </Layout>
    );
};

export default SchoolAnalytics;
