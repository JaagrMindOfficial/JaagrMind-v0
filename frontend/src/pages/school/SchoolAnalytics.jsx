import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from 'recharts';
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
    faCircleXmark,
    faLightbulb,
    faChalkboardTeacher,
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

const getBucketFromScore = (score) => {
    if (score <= 14) return 'Thriving';
    if (score <= 22) return 'Growing';
    return 'Needs Support';
};

import AnalyticsCharts from '../../components/school/AnalyticsCharts';

const SchoolAnalytics = () => {
    // ... existing state ...
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [classes, setClasses] = useState([]);
    const [uniqueClasses, setUniqueClasses] = useState([]);
    const [filters, setFilters] = useState({ class: '', section: '' });
    const [activeTab, setActiveTab] = useState('overview');
    const [includeBranches, setIncludeBranches] = useState(false);
    const [branches, setBranches] = useState([]); // State for branches list
    const [selectedBranch, setSelectedBranch] = useState(''); // State for selected branch filter
    const queryParams = new URLSearchParams(window.location.search);
    const viewSchoolId = queryParams.get('schoolId');

    // Student details view
    const [studentsData, setStudentsData] = useState(null);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentFilters, setStudentFilters] = useState({ class: '', section: '', assessmentId: '', search: '' });

    // Student detail modal
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDetail, setStudentDetail] = useState(null);
    const [studentDetailLoading, setStudentDetailLoading] = useState(false);
    const [expandedSubmission, setExpandedSubmission] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // Helper to calculate student-specific analytics for the charts
    const getStudentAnalytics = (student) => {
        if (!student || !student.submissions) return null;

        // 1. Distributions
        const distributions = { A: {}, B: {}, C: {}, D: {} };
        // Initialize
        ['A', 'B', 'C', 'D'].forEach(key => {
            distributions[key] = { 'Skill Stable': 0, 'Skill Emerging': 0, 'Skill Support Needed': 0 };
        });

        const monthlyTrends = {};

        student.submissions.forEach(sub => {
            // Distributions
            if (sub.sectionScores) {
                Object.entries(sub.sectionScores).forEach(([key, score]) => {
                    const bucket = getBucketFromScore(score);
                    if (distributions[key][bucket] !== undefined) distributions[key][bucket]++;
                });
            }

            // Trends
            if (sub.submittedAt) {
                const date = new Date(sub.submittedAt);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                const monthName = date.toLocaleString('default', { month: 'short' });

                if (!monthlyTrends[monthKey]) {
                    monthlyTrends[monthKey] = { totalScore: 0, count: 0, month: monthName, year: date.getFullYear() };
                }
                monthlyTrends[monthKey].totalScore += sub.totalScore;
                monthlyTrends[monthKey].count++;
            }
        });

        // Format Trends
        const trendData = Object.entries(monthlyTrends)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, data]) => ({
                name: `${data.month} ${data.year}`,
                avgScore: (data.totalScore / data.count).toFixed(1),
                count: data.count
            }));

        return {
            distributions,
            trends: { monthly: trendData }
        };
    };

    useEffect(() => {
        fetchClasses();
        fetchBranches(); // Fetch branches on mount
    }, []);

    useEffect(() => {
        fetchAnalytics();
        fetchStudentsData(); // Ensure student list updates too
    }, [filters, selectedBranch]); // Refetch on branch/filter change

    const fetchBranches = async () => {
        try {
            const response = await api.get('/api/school/branches');
            setBranches(response.data || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchClasses = async () => {
        try {
            const params = new URLSearchParams();
            if (viewSchoolId) params.append('schoolId', viewSchoolId);
            if (selectedBranch) params.append('schoolId', selectedBranch); // Pass selected branch
            // Also fetch classes for branches if aggregated
            // For now, the backend classes endpoint might need update, or we just rely on main school classes
            // Ideally, update classes endpoint too. For now let's keep it simple.
            const response = await api.get(`/api/school/classes?${params.toString()}`);
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

            // Branch filtering logic
            if (selectedBranch) {
                params.append('schoolId', selectedBranch);
            } else if (viewSchoolId) {
                params.append('schoolId', viewSchoolId);
            }
            // For super school default view (no selectedBranch), backend handles aggregation automatically now

            const response = await api.get(`/api/school/analytics?${params.toString()}`);
            setData(response.data);
            setError(null);
        } catch (error) {
            if (error.response?.status === 403) {
                setError('Insights not available for your school. Please contact admin.');
            } else {
                setError('Error loading insights');
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

            if (selectedBranch) {
                params.append('schoolId', selectedBranch);
            } else if (viewSchoolId) {
                params.append('schoolId', viewSchoolId);
            }

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
            const response = await api.get(`/api/school/students-analytics?studentId=${studentId}`);
            // Fix: API returns { students: [...] }, so access response.data.students[0]
            const student = response.data.students?.[0] || null;
            setStudentDetail(student);
            setExpandedSubmission(student?.submissions?.[0]?._id || null);
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
        if (score <= 14) return 'Thriving';
        if (score <= 22) return 'Growing';
        return 'Needs Support';
    };

    if (loading && !data) {
        return (
            <Layout title="Insights">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    if (error) {
        return (
            <Layout title="Insights">
                <motion.div
                    className="card text-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '60px 24px' }}
                >
                    <div style={{ fontSize: '4rem', marginBottom: '16px', opacity: 0.5 }}>🔒</div>
                    <h3 style={{ marginBottom: '8px' }}>Insights Restricted</h3>
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
        <Layout
            title={data?.schoolName ? data.schoolName : (viewSchoolId ? "Branch Insights" : "School Insights")}
            subtitle="Student skill check-in insights"
        >
            {viewSchoolId && (
                <div style={{ marginBottom: '16px' }}>
                    <button
                        onClick={() => window.location.href = '/school/branches'}
                        className="btn btn-outline btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <FontAwesomeIcon icon={faChevronDown} rotation={90} /> Back to Branches
                    </button>
                </div>
            )}
            {/* Tabs */}
            <div className="analytics-tabs" style={{ marginBottom: '24px' }}>
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <FontAwesomeIcon icon={faChartBar} /> Overview
                </button>

                <button
                    className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => { setActiveTab('students'); fetchStudentsData({}); }}
                >
                    <FontAwesomeIcon icon={faUsers} /> Students
                </button>
            </div>

            {/* Filters */}
            {activeTab === 'overview' && (
                <motion.div
                    className="card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: '24px', padding: '16px 24px' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <FontAwesomeIcon icon={faFilter} style={{ color: 'var(--primary-purple)' }} />

                        {/* Branch Filter for Super School */}
                        {branches.length > 0 && (
                            <select
                                className="form-input"
                                value={selectedBranch}
                                onChange={(e) => {
                                    setSelectedBranch(e.target.value);
                                    setFilters(prev => ({ ...prev, class: '', section: '' }));
                                }}
                                style={{ width: 'auto', minWidth: '180px' }}
                            >
                                <option value="">All Branches</option>
                                {branches.map(branch => (
                                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                                ))}
                            </select>
                        )}

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
            )}

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
                            <div className="stat-label">Total Check-ins</div>
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
                            <div className="stat-label">Avg Skill Index</div>
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

                    {/* Participation Chart */}
                    {data?.participationByGrade && data.participationByGrade.length > 0 && (
                        <motion.div
                            className="card mb-6"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.35 }}
                        >
                            <h3 className="card-title mb-4">
                                <FontAwesomeIcon icon={faUsers} style={{ marginRight: '8px', color: 'var(--primary-purple)' }} />
                                Participation by Grade
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={data.participationByGrade}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="grade" label={{ value: 'Grade', position: 'insideBottom', offset: -5 }} />
                                    <YAxis label={{ value: 'Students', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="completed" name="Completed" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="pending" name="Pending" stackId="a" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </motion.div>
                    )}

                    {/* NEW: Analytics Charts Component */}
                    <AnalyticsCharts data={data} variant="school" />

                    {/* Guidelines Footer */}
                    <div className="mt-8 p-6 bg-white rounded-xl border border-blue-100 items-center text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                            <FontAwesomeIcon icon={faLightbulb} size="lg" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">What should we do next?</h3>
                        <p className="text-gray-600 max-w-2xl mx-auto mb-4">
                            Patterns matter more than individuals. If you see younger grades showing lower focus or middle grades showing lower social confidence,
                            this helps contextualize struggles as developmental, not personal.
                        </p>
                        <p className="text-sm text-gray-500">
                            If you have questions about implementation, data use, or best practices, the Jaagr Mind team is available to support your school.
                            We work in strong partnership with educators, emotional regulation coaches, and experts.
                        </p>
                    </div>
                </>
            )}

            {/* Skills Tab */}

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

                        {/* Branch Filter for Students Tab */}
                        {branches.length > 0 && (
                            <select
                                className="form-input"
                                value={selectedBranch} // Use global selectedBranch
                                onChange={(e) => {
                                    setSelectedBranch(e.target.value);
                                    // Reset student filters might be good or keep them? 
                                    // Let's keep them but maybe class/section needs reset if they don't match
                                }}
                                style={{ maxWidth: '180px' }}
                            >
                                <option value="">All Branches</option>
                                {branches.map(branch => (
                                    <option key={branch._id} value={branch._id}>{branch.name}</option>
                                ))}
                            </select>
                        )}

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
                            <option value="">All Check-ins</option>
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
                                        <th>Branch</th>
                                        <th>Class</th>
                                        <th>Roll No</th>
                                        <th>Check-in</th>
                                        <th>Index</th>
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
                                                            <td rowSpan={student.submissions.length}>
                                                                {branches.find(b => b._id === student.schoolId)?.name || 'Main'}
                                                            </td>
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
                                                <td>
                                                    {branches.find(b => b._id === student.schoolId)?.name || 'Main'}
                                                </td>
                                                <td>{student.class} {student.section}</td>
                                                <td>{student.rollNo || '-'}</td>
                                                <td colSpan="4" className="text-muted">No check-ins completed</td>
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
                                                <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{studentDetail.name}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                                                    <FontAwesomeIcon icon={faIdCard} style={{ marginRight: '6px' }} />
                                                    Access ID
                                                </div>
                                                <code style={{ fontSize: '0.95rem' }}>{studentDetail.accessId}</code>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Class</div>
                                                <div style={{ fontWeight: 500 }}>{studentDetail.class} {studentDetail.section}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>Roll No</div>
                                                <div>{studentDetail.rollNo || '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
                                                    <FontAwesomeIcon icon={faClipboardCheck} style={{ marginRight: '6px' }} />
                                                    Total Check-ins
                                                </div>
                                                <div style={{ fontWeight: 600, color: 'var(--primary-purple)' }}>{studentDetail.submissions.length}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Student Analytics Charts */}
                                    <AnalyticsCharts
                                        data={getStudentAnalytics(studentDetail)}
                                        variant="student"
                                        title="Student Performance Profile"
                                    />

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
                                                            Item-wise Responses
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
                                                                    <span>Index: {sectionData.totalScore}</span>
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
                                                                                # {answer.questionIndex}
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
                                            <p>No check-ins completed by this student</p>
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
