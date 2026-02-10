import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSchool, faUserGraduate, faClipboardCheck, faChartLine, faSearch,
    faChevronRight, faArrowLeft, faUsers, faCheckCircle, faClock,
    faExclamationTriangle, faHandHoldingHeart, faSmile, faBrain,
    faMobileAlt, faEye, faChartPie, faGraduationCap, faQuestionCircle,
    faChevronDown, faChevronUp, faFilter, faListOl
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import Layout from '../../components/common/Layout';

import './Analytics.css';

// Skill area config
const SKILL_AREAS = {
    A: { name: 'Focus', icon: faBrain, color: '#8B5CF6' },
    B: { name: 'Self-Esteem', icon: faSmile, color: '#EC4899' },
    C: { name: 'Social', icon: faUsers, color: '#10B981' },
    D: { name: 'Digital Hygiene', icon: faMobileAlt, color: '#F59E0B' }
};

const BUCKET_COLORS = {
    green: '#10B981',
    yellow: '#F59E0B',
    red: '#EF4444',
    doingWell: '#10B981',
    needsSupport: '#F59E0B',
    needsAttention: '#EF4444'
};

const Analytics = () => {
    // Navigation state
    const [currentLevel, setCurrentLevel] = useState('nationwide'); // nationwide, school, class, student
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Data states
    const [nationwideData, setNationwideData] = useState(null);
    const [schoolData, setSchoolData] = useState(null);
    const [classData, setClassData] = useState(null);
    const [studentData, setStudentData] = useState(null);

    // Test-wise analytics states
    const [testsData, setTestsData] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [testAnalytics, setTestAnalytics] = useState(null);

    // UI states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [studentTestFilter, setStudentTestFilter] = useState(null); // Filter student results by test
    const [expandedSubmission, setExpandedSubmission] = useState(null); // For expanding question details
    const [trendPeriod, setTrendPeriod] = useState('monthly'); // 'monthly' or 'weekly' for trend charts

    // URL params handling
    const location = useLocation();

    // Fetch nationwide data and tests
    useEffect(() => {
        fetchNationwideData();
        fetchTestsData();
    }, []);

    // Effect to handle URL params for deep linking
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const schoolIdParam = params.get('schoolId');

        if (schoolIdParam && nationwideData?.schools && !selectedSchool) {
            // Try to find in top-level schools
            let targetSchool = nationwideData.schools.find(s => s._id === schoolIdParam);

            // If not found, try to find in branches
            if (!targetSchool) {
                for (const school of nationwideData.schools) {
                    if (school.branches && school.branches.length > 0) {
                        const foundBranch = school.branches.find(b => b._id === schoolIdParam);
                        if (foundBranch) {
                            targetSchool = foundBranch;
                            break;
                        }
                    }
                }
            }

            if (targetSchool) {
                navigateToSchool(targetSchool);
            }
        }
    }, [location.search, nationwideData]);

    const fetchNationwideData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/admin/analytics/overview');
            console.log('API Response:', response.data);
            setNationwideData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching nationwide data:', err);
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const fetchSchoolData = async (schoolId) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/admin/schools/${schoolId}/analytics`);
            setSchoolData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching school data:', err);
            setError('Failed to load school analytics');
        } finally {
            setLoading(false);
        }
    };

    const fetchClassData = async (schoolId, className) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/admin/schools/${schoolId}/class/${encodeURIComponent(className)}/analytics`);
            setClassData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching class data:', err);
            setError('Failed to load class analytics');
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentData = async (studentId, testId = null) => {
        try {
            setLoading(true);
            const url = testId
                ? `/api/admin/students/${studentId}/analytics?testId=${testId}`
                : `/api/admin/students/${studentId}/analytics`;
            const response = await api.get(url);
            setStudentData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching student data:', err);
            setError('Failed to load student analytics');
        } finally {
            setLoading(false);
        }
    };

    // Fetch tests list
    const fetchTestsData = async () => {
        try {
            const response = await api.get('/api/admin/analytics/tests');
            setTestsData(response.data);
        } catch (err) {
            console.error('Error fetching tests data:', err);
        }
    };

    // Fetch specific test analytics
    const fetchTestAnalytics = async (testId) => {
        try {
            setLoading(true);
            const response = await api.get(`/api/admin/analytics/tests/${testId}`);
            setTestAnalytics(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching test analytics:', err);
            setError('Failed to load test analytics');
        } finally {
            setLoading(false);
        }
    };

    // Navigation handlers
    const navigateToSchool = (school) => {
        setSelectedSchool(school);
        setCurrentLevel('school');
        fetchSchoolData(school._id);
    };

    const navigateToClass = (className) => {
        setSelectedClass(className);
        setCurrentLevel('class');
        fetchClassData(selectedSchool._id, className);
    };

    const navigateToStudent = (student) => {
        setSelectedStudent(student);
        setCurrentLevel('student');
        fetchStudentData(student._id);
    };

    const navigateBack = () => {
        if (currentLevel === 'student') {
            setCurrentLevel('class');
            setSelectedStudent(null);
        } else if (currentLevel === 'class') {
            setCurrentLevel('school');
            setSelectedClass(null);
        } else if (currentLevel === 'school') {
            setCurrentLevel('nationwide');
            setSelectedSchool(null);
        }
    };

    // Filtered schools based on search
    const filteredSchools = useMemo(() => {
        if (!nationwideData?.schools) return [];
        if (!searchQuery.trim()) return nationwideData.schools;
        const query = searchQuery.toLowerCase();
        return nationwideData.schools.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.schoolId?.toLowerCase().includes(query)
        );
    }, [nationwideData?.schools, searchQuery]);

    // Breadcrumb component
    const Breadcrumbs = () => (
        <div className="analytics-breadcrumbs">
            <button
                className={`breadcrumb-item ${currentLevel === 'nationwide' ? 'active' : ''}`}
                onClick={() => { setCurrentLevel('nationwide'); setSelectedSchool(null); setSelectedClass(null); setSelectedStudent(null); }}
            >
                <FontAwesomeIcon icon={faChartPie} /> All India
            </button>
            {selectedSchool && (
                <>
                    <FontAwesomeIcon icon={faChevronRight} className="breadcrumb-separator" />
                    <button
                        className={`breadcrumb-item ${currentLevel === 'school' ? 'active' : ''}`}
                        onClick={() => { setCurrentLevel('school'); setSelectedClass(null); setSelectedStudent(null); }}
                    >
                        <FontAwesomeIcon icon={faSchool} /> {selectedSchool.name}
                    </button>
                </>
            )}
            {selectedClass && (
                <>
                    <FontAwesomeIcon icon={faChevronRight} className="breadcrumb-separator" />
                    <button
                        className={`breadcrumb-item ${currentLevel === 'class' ? 'active' : ''}`}
                        onClick={() => { setCurrentLevel('class'); setSelectedStudent(null); }}
                    >
                        <FontAwesomeIcon icon={faGraduationCap} /> Class {selectedClass}
                    </button>
                </>
            )}
            {selectedStudent && (
                <>
                    <FontAwesomeIcon icon={faChevronRight} className="breadcrumb-separator" />
                    <span className="breadcrumb-item active">
                        <FontAwesomeIcon icon={faUserGraduate} /> {selectedStudent.name}
                    </span>
                </>
            )}
        </div>
    );

    // Hero Stats Card
    const HeroStats = ({ stats }) => {
        if (!stats) return null;
        return (
            <div className="hero-stats-grid">
                <motion.div
                    className="hero-stat-card purple"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faSchool} /></div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalSchools?.toLocaleString() || stats.totalStudents?.toLocaleString() || 0}</span>
                        <span className="stat-label">{stats.totalSchools !== undefined ? 'Schools' : 'Students'}</span>
                    </div>
                </motion.div>
                <motion.div
                    className="hero-stat-card blue"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faUserGraduate} /></div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalStudents?.toLocaleString() || stats.completedStudents?.toLocaleString() || 0}</span>
                        <span className="stat-label">{stats.totalStudents !== undefined && stats.totalSchools !== undefined ? 'Students' : 'Completed'}</span>
                    </div>
                </motion.div>
                <motion.div
                    className="hero-stat-card green"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faClipboardCheck} /></div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalSubmissions?.toLocaleString() || stats.pendingStudents?.toLocaleString() || 0}</span>
                        <span className="stat-label">{stats.totalSubmissions !== undefined ? 'Completed' : 'Pending'}</span>
                    </div>
                </motion.div>
                <motion.div
                    className="hero-stat-card orange"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="stat-icon"><FontAwesomeIcon icon={faChartLine} /></div>
                    <div className="stat-content">
                        <span className="stat-value">{stats.completionRate !== undefined ? `${stats.completionRate}%` : (stats.avgScore || 0)}</span>
                        <span className="stat-label">{stats.completionRate !== undefined ? 'Completion' : 'Avg Index'}</span>
                    </div>
                </motion.div>
            </div>
        );
    };

    // Distribution Donut Chart
    const DistributionDonut = ({ data, title }) => {
        const chartData = [
            { name: 'Doing Well', value: data?.doingWell || 0, color: BUCKET_COLORS.doingWell },
            { name: 'Needs Support', value: data?.needsSupport || 0, color: BUCKET_COLORS.needsSupport },
            { name: 'Priority Support', value: data?.needsAttention || 0, color: BUCKET_COLORS.needsAttention }
        ];
        const total = chartData.reduce((sum, d) => sum + d.value, 0);
        const wellPercent = total > 0 ? Math.round((data?.doingWell || 0) / total * 100) : 0;

        return (
            <div className="chart-card distribution-chart">
                <h3>{title}</h3>
                <div className="donut-chart-container">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie data={chartData} dataKey="value" innerRadius={60} outerRadius={80} paddingAngle={2}>
                                {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="donut-center">
                        <span className="donut-percent">{wellPercent}%</span>
                        <span className="donut-label">Doing Well</span>
                    </div>
                </div>
                <div className="chart-legend">
                    {chartData.map((d, i) => (
                        <div key={i} className="legend-item">
                            <span className="legend-dot" style={{ background: d.color }}></span>
                            <span>{d.name}: {d.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Trend Line Chart
    const TrendChart = ({ data }) => (
        <div className="chart-card trend-chart">
            <h3>Monthly Trend</h3>
            {(!data || data.length === 0) ? (
                <div className="empty-chart-state">
                    <FontAwesomeIcon icon={faChartLine} className="empty-icon" />
                    <p>No data available yet</p>
                    <span>Monthly trends will appear here once check-ins are recorded</span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                        <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                        <Tooltip
                            cursor={{ stroke: '#8B5CF6', strokeWidth: 2 }}
                            contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: '#1f2937' }}
                            itemStyle={{ color: '#1f2937' }}
                        />
                        <Line type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 4 }} name="Check-ins" />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );

    // Top Schools Bar Chart
    const TopSchoolsChart = ({ data }) => (
        <div className="chart-card bar-chart">
            <h3>Most Active Schools</h3>
            {(!data || data.length === 0) ? (
                <div className="empty-chart-state">
                    <FontAwesomeIcon icon={faSchool} className="empty-icon" />
                    <p>No data available yet</p>
                    <span>School rankings will appear here once submissions are recorded</span>
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.slice(0, 6)} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis type="number" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', border: 'none', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', color: '#1f2937' }}
                            itemStyle={{ color: '#1f2937' }}
                        />
                        <Bar dataKey="submissionCount" fill="#8B5CF6" radius={[0, 4, 4, 0]} name="Check-ins" />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );

    // School List Table
    const SchoolsTable = ({ schools }) => (
        <div className="data-table-container">
            <div className="table-header">
                <h3>All Schools</h3>
                <div className="search-box">
                    <FontAwesomeIcon icon={faSearch} />
                    <input
                        type="text"
                        placeholder="Search schools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="table-scroll">
                <table className="analytics-table">
                    <thead>
                        <tr>
                            <th>School</th>
                            <th>Students</th>
                            <th>Completed</th>
                            <th>Completion</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {schools.map((school, i) => (
                            <motion.tr
                                key={school._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03 }}
                                onClick={() => navigateToSchool(school)}
                                className="clickable-row"
                            >
                                <td>
                                    <div className="school-cell">
                                        {school.logo ? (
                                            <img src={school.logo} alt="" className="school-logo-small" />
                                        ) : (
                                            <div className="school-logo-placeholder">
                                                <FontAwesomeIcon icon={faSchool} />
                                            </div>
                                        )}
                                        <div>
                                            <span className="school-name">{school.name}</span>
                                            <span className="school-id">{school.schoolId}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>{school.studentCount}</td>
                                <td>{school.submissionCount}</td>
                                <td>
                                    <div className={`completion-badge ${school.completionRate >= 75 ? 'high' : school.completionRate >= 40 ? 'medium' : 'low'}`}>
                                        {school.completionRate}%
                                    </div>
                                </td>
                                <td>
                                    <FontAwesomeIcon icon={faChevronRight} className="row-arrow" />
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Class Cards Grid
    const ClassGrid = ({ classes }) => (
        <div className="class-grid">
            {classes.map((cls, i) => (
                <motion.div
                    key={cls.className}
                    className="class-card"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigateToClass(cls.className)}
                    whileHover={{ scale: 1.02 }}
                >
                    <div className="class-header">
                        <span className="class-name">Class {cls.className}</span>
                        <span className={`completion-badge ${cls.completionRate >= 75 ? 'high' : cls.completionRate >= 40 ? 'medium' : 'low'}`}>
                            {cls.completionRate}%
                        </span>
                    </div>
                    <div className="class-stats">
                        <div className="class-stat">
                            <FontAwesomeIcon icon={faUsers} />
                            <span>{cls.totalStudents} Students</span>
                        </div>
                        <div className="class-stat">
                            <FontAwesomeIcon icon={faCheckCircle} />
                            <span>{cls.completedStudents} Done</span>
                        </div>
                        <div className="class-stat">
                            <FontAwesomeIcon icon={faClock} />
                            <span>{cls.pendingStudents} Pending</span>
                        </div>
                    </div>
                    <div className="class-distribution">
                        <div className="dist-bar">
                            <div className="dist-segment green" style={{ width: `${cls.overallDistribution.doingWell / (cls.completedStudents || 1) * 100}%` }}></div>
                            <div className="dist-segment yellow" style={{ width: `${cls.overallDistribution.needsSupport / (cls.completedStudents || 1) * 100}%` }}></div>
                            <div className="dist-segment red" style={{ width: `${cls.overallDistribution.needsAttention / (cls.completedStudents || 1) * 100}%` }}></div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );

    // Students Table
    const StudentsTable = ({ students }) => (
        <div className="data-table-container">
            <div className="table-header">
                <h3>Students</h3>
            </div>
            <div className="table-scroll">
                <table className="analytics-table">
                    <thead>
                        <tr>
                            <th>Student</th>
                            <th>Roll No</th>
                            <th>Section</th>

                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, i) => (
                            <motion.tr
                                key={student._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.02 }}
                                onClick={() => navigateToStudent(student)}
                                className="clickable-row"
                            >
                                <td>
                                    <div className="student-cell">
                                        <div className="student-avatar">
                                            {student.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <span className="student-name">{student.name}</span>
                                            <span className="student-id">{student.accessId}</span>
                                        </div>
                                    </div>
                                </td>
                                <td>{student.rollNo || '-'}</td>
                                <td>{student.section || '-'}</td>

                                <td>
                                    {student.hasSubmission ? (
                                        <span className={`bucket-badge ${student.bucket}`}>
                                            {student.bucket === 'stable' ? 'Doing Well' :
                                                student.bucket === 'emerging' ? 'Emerging' :
                                                    student.bucket === 'support' ? 'Needs Support' : student.bucket}
                                        </span>
                                    ) : (
                                        <span className="bucket-badge pending">Pending</span>
                                    )}
                                </td>
                                <td>
                                    <button className="view-btn" onClick={(e) => { e.stopPropagation(); navigateToStudent(student); }}>
                                        <FontAwesomeIcon icon={faEye} />
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // Student Detail View
    const StudentDetail = ({ student }) => {
        if (!student) return <div className="loading-state">Loading student data...</div>;

        const handleTestFilterChange = (testId) => {
            setStudentTestFilter(testId);
            if (selectedStudent) {
                fetchStudentData(selectedStudent._id, testId || null);
            }
        };

        const toggleSubmissionExpand = (submissionId) => {
            setExpandedSubmission(expandedSubmission === submissionId ? null : submissionId);
        };

        return (
            <div className="student-detail-view">
                <div className="student-profile-card">
                    <div className="profile-avatar large">
                        {student.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="profile-info">
                        <h2>{student.name}</h2>
                        <p>Access ID: {student.accessId}</p>
                        <p>Class {student.class}{student.section ? `-${student.section}` : ''} | Roll No: {student.rollNo || 'N/A'}</p>
                    </div>
                </div>

                {/* Test Filter Dropdown */}
                {student.availableTests?.length > 0 && (
                    <div className="test-filter-section">
                        <label><FontAwesomeIcon icon={faFilter} /> Filter by Test:</label>
                        <select
                            value={studentTestFilter || ''}
                            onChange={(e) => handleTestFilterChange(e.target.value)}
                            className="test-filter-select"
                        >
                            <option value="">All Tests</option>
                            {student.availableTests.map(test => (
                                <option key={test._id} value={test._id}>{test.title}</option>
                            ))}
                        </select>
                    </div>
                )}

                {student.submissions?.length > 0 ? (
                    <>
                        {/* Section Scores Grid */}
                        <div className="section-scores-grid">
                            {Object.entries(SKILL_AREAS).map(([key, area]) => {
                                const score = student.submissions[0]?.sectionScores?.[key] || 0;
                                const bucket = score >= 8 && score <= 14 ? 'green' : score >= 15 && score <= 22 ? 'yellow' : 'red';
                                return (
                                    <div key={key} className={`skill-score-card ${bucket}`}>
                                        <FontAwesomeIcon icon={area.icon} style={{ color: area.color }} />
                                        <span className="skill-name">{area.name}</span>
                                        <span className="skill-score">{score}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Assessment History with Question Details */}
                        <div className="assessment-history">
                            <h3><FontAwesomeIcon icon={faClipboardCheck} /> Check-in History</h3>
                            {student.submissions.map((sub, i) => (
                                <motion.div
                                    key={sub._id || i}
                                    className="submission-card-expanded"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                >
                                    <div
                                        className="sub-header clickable"
                                        onClick={() => toggleSubmissionExpand(sub._id)}
                                    >
                                        <div className="sub-header-left">
                                            <span className="sub-title">{sub.assessmentTitle}</span>
                                            <span className="sub-date">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="sub-header-right">
                                            <span className="sub-score-badge">Index: {sub.totalScore}</span>
                                            <span className={`bucket-badge ${sub.bucket?.toLowerCase().replace(/\s+/g, '')}`}>
                                                {sub.bucket}
                                            </span>
                                            <FontAwesomeIcon
                                                icon={expandedSubmission === sub._id ? faChevronUp : faChevronDown}
                                                className="expand-icon"
                                            />
                                        </div>
                                    </div>

                                    {/* Expanded Question Details */}
                                    <AnimatePresence>
                                        {expandedSubmission === sub._id && (
                                            <motion.div
                                                className="questions-detail"
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                <div className="questions-header">
                                                    <FontAwesomeIcon icon={faListOl} />
                                                    <span>Responses ({sub.answers?.length || 0} items)</span>
                                                </div>
                                                <div className="questions-list">
                                                    {sub.answers?.map((ans, qIndex) => (
                                                        <div key={qIndex} className="question-item">
                                                            <div className="question-number">Q{ans.questionIndex + 1}</div>
                                                            <div className="question-content">
                                                                <div className="question-text">{ans.questionText}</div>
                                                                <div className="question-section">
                                                                    Section: {SKILL_AREAS[ans.section]?.name || ans.section}
                                                                </div>
                                                                <div className="options-list">
                                                                    {ans.options?.map((opt, optIndex) => (
                                                                        <div
                                                                            key={optIndex}
                                                                            className={`option-item ${optIndex === ans.selectedOptionIndex ? 'selected' : ''}`}
                                                                        >
                                                                            <span className="option-marker">
                                                                                {optIndex === ans.selectedOptionIndex ? '●' : '○'}
                                                                            </span>
                                                                            <span className="option-label">{opt.label}</span>
                                                                            {optIndex === ans.selectedOptionIndex && (
                                                                                <span className="marks-badge">+{ans.marks} pts</span>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="no-submissions-state">
                        <FontAwesomeIcon icon={faClock} />
                        <p>This student has not completed any check-ins yet.</p>
                    </div>
                )}
            </div>
        );
    };

    // Main render
    if (loading && !nationwideData) {
        return (
            <Layout title="Analytics" subtitle="Comprehensive insights across all schools">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading analytics...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Analytics" subtitle="Comprehensive insights across all schools">

            <div className="analytics-page">
                <Breadcrumbs />

                {currentLevel !== 'nationwide' && (
                    <button className="back-button" onClick={navigateBack}>
                        <FontAwesomeIcon icon={faArrowLeft} /> Back
                    </button>
                )}

                <AnimatePresence mode="wait">
                    {currentLevel === 'nationwide' && nationwideData && (
                        <motion.div
                            key="nationwide"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="analytics-content"
                        >
                            <h1 className="page-title">National Insights Overview</h1>
                            <HeroStats stats={nationwideData.totals} />

                            <div className="charts-row">
                                <TrendChart data={nationwideData.monthlyTrend} />
                                <DistributionDonut data={nationwideData.overallDistribution} title="Overall Distribution" />
                            </div>

                            <TopSchoolsChart data={nationwideData.topSchools} />

                            {/* Test-wise Analytics Section */}
                            {testsData && testsData.tests && testsData.tests.length > 0 && (
                                <>
                                    <h2 className="section-title">Check-in Insights</h2>
                                    <div className="test-cards-grid">
                                        {testsData.tests.map(test => (
                                            <motion.div
                                                key={test._id}
                                                className={`test-card ${selectedTest?._id === test._id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedTest(test);
                                                    fetchTestAnalytics(test._id);
                                                }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                <div className="test-card-header">
                                                    <h3>{test.title}</h3>
                                                    <span className="test-completion">{test.completionRate}%</span>
                                                </div>
                                                <div className="test-card-stats">
                                                    <div className="test-stat">
                                                        <FontAwesomeIcon icon={faClipboardCheck} />
                                                        <span>{test.completedSubmissions} completed</span>
                                                    </div>
                                                    <div className="test-stat">
                                                        <FontAwesomeIcon icon={faClock} />
                                                        <span>{test.pendingSubmissions} pending</span>
                                                    </div>
                                                    <div className="test-stat">
                                                        <FontAwesomeIcon icon={faChartLine} />
                                                        <span>Avg: {test.avgScore}</span>
                                                    </div>
                                                </div>
                                                <div className="test-distribution">
                                                    <div className="dist-bar">
                                                        <div className="dist-segment green" style={{ width: `${(test.distribution.doingWell / (test.completedSubmissions || 1)) * 100}%` }}></div>
                                                        <div className="dist-segment yellow" style={{ width: `${(test.distribution.needsSupport / (test.completedSubmissions || 1)) * 100}%` }}></div>
                                                        <div className="dist-segment red" style={{ width: `${(test.distribution.needsAttention / (test.completedSubmissions || 1)) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Test Analytics Detail */}
                                    {selectedTest && testAnalytics && (
                                        <motion.div
                                            className="test-analytics-detail"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                        >
                                            <div className="test-detail-header">
                                                <h3>
                                                    <FontAwesomeIcon icon={faClipboardCheck} />
                                                    {testAnalytics.assessment.title} - Detailed Insights
                                                </h3>
                                                <button className="close-btn" onClick={() => { setSelectedTest(null); setTestAnalytics(null); }}>×</button>
                                            </div>

                                            <div className="test-detail-stats">
                                                <div className="test-stat-card">
                                                    <span className="stat-value">{testAnalytics.stats.totalSubmissions}</span>
                                                    <span className="stat-label">Total Submissions</span>
                                                </div>
                                                <div className="test-stat-card">
                                                    <span className="stat-value">{testAnalytics.stats.avgScore}</span>
                                                    <span className="stat-label">Average Index</span>
                                                </div>
                                                <div className="test-stat-card green">
                                                    <span className="stat-value">{testAnalytics.stats.distribution.doingWell}</span>
                                                    <span className="stat-label">Doing Well</span>
                                                </div>
                                                <div className="test-stat-card yellow">
                                                    <span className="stat-value">{testAnalytics.stats.distribution.needsSupport}</span>
                                                    <span className="stat-label">Needs Support</span>
                                                </div>
                                                <div className="test-stat-card red">
                                                    <span className="stat-value">{testAnalytics.stats.distribution.needsAttention}</span>
                                                    <span className="stat-label">Priority Support</span>
                                                </div>
                                            </div>

                                            {testAnalytics.schoolBreakdown?.length > 0 && (
                                                <>
                                                    <h4>School-wise Performance</h4>
                                                    <div className="school-breakdown-table">
                                                        <table className="analytics-table">
                                                            <thead>
                                                                <tr>
                                                                    <th>School</th>
                                                                    <th>Check-ins</th>

                                                                    <th>Distribution</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {testAnalytics.schoolBreakdown.map(school => (
                                                                    <tr key={school._id}>
                                                                        <td>{school.name}</td>
                                                                        <td>{school.submissions}</td>

                                                                        <td>
                                                                            <div className="mini-dist">
                                                                                <span className="green">{school.distribution.doingWell}</span>
                                                                                <span className="yellow">{school.distribution.needsSupport}</span>
                                                                                <span className="red">{school.distribution.needsAttention}</span>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </>
                            )}

                            <SchoolsTable schools={filteredSchools} />
                        </motion.div>
                    )}

                    {currentLevel === 'school' && schoolData && (
                        <motion.div
                            key="school"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="analytics-content"
                        >
                            <div className="school-header-section">
                                {schoolData.school.logo && <img src={schoolData.school.logo} alt="" className="school-logo-large" />}
                                <div>
                                    <h1>{schoolData.school.name}</h1>
                                    <p>{(typeof schoolData.school.address === 'string' ? schoolData.school.address : schoolData.school.address?.full) || schoolData.school.schoolId}</p>
                                </div>
                            </div>

                            <HeroStats stats={schoolData.stats} />

                            {/* Trend Charts Section with Toggle */}
                            <div className="trend-section">
                                <div className="trend-header">
                                    <h2 className="section-title"><FontAwesomeIcon icon={faChartLine} /> Activity Trends</h2>
                                    <div className="trend-toggle">
                                        <button
                                            className={`toggle-btn ${trendPeriod === 'weekly' ? 'active' : ''}`}
                                            onClick={() => setTrendPeriod('weekly')}
                                        >
                                            Weekly
                                        </button>
                                        <button
                                            className={`toggle-btn ${trendPeriod === 'monthly' ? 'active' : ''}`}
                                            onClick={() => setTrendPeriod('monthly')}
                                        >
                                            Monthly
                                        </button>
                                    </div>
                                </div>
                                <TrendChart
                                    data={trendPeriod === 'monthly'
                                        ? schoolData.monthlyTrend
                                        : schoolData.weeklyTrend?.map(w => ({ month: w.week, count: w.count, avgScore: w.avgScore }))}
                                />
                            </div>

                            <h2 className="section-title">Classes</h2>
                            <ClassGrid classes={schoolData.classes} />

                            {schoolData.recentSubmissions?.length > 0 && (
                                <>
                                    <h2 className="section-title">Recent Check-ins</h2>
                                    <div className="recent-submissions-list">
                                        {schoolData.recentSubmissions.slice(0, 5).map((sub, i) => (
                                            <div key={i} className="recent-sub-item">
                                                <span>{sub.studentName}</span>
                                                <span>Class {sub.class}</span>

                                                <span className={`bucket-badge ${sub.bucket}`}>{sub.bucket}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                    {currentLevel === 'class' && classData && (
                        <motion.div
                            key="class"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="analytics-content"
                        >
                            <h1 className="page-title">Class {classData.className} Analytics</h1>
                            <HeroStats stats={classData.stats} />

                            <div className="charts-row">
                                <DistributionDonut data={classData.overallDistribution} title="Class Distribution" />
                                <div className="chart-card skill-breakdown">
                                    <h3>Focus Area Breakdown</h3>
                                    <div className="skill-mini-charts">
                                        {Object.entries(SKILL_AREAS).map(([key, area]) => (
                                            <div key={key} className="mini-skill">
                                                <FontAwesomeIcon icon={area.icon} style={{ color: area.color }} />
                                                <span>{area.name}</span>
                                                <div className="mini-bar">
                                                    <div className="bar-fill green" style={{ width: `${(classData.skillDistribution[key]?.green || 0) * 10}%` }}></div>
                                                    <div className="bar-fill yellow" style={{ width: `${(classData.skillDistribution[key]?.yellow || 0) * 10}%` }}></div>
                                                    <div className="bar-fill red" style={{ width: `${(classData.skillDistribution[key]?.red || 0) * 10}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <StudentsTable students={classData.students} />
                        </motion.div>
                    )}

                    {currentLevel === 'student' && (
                        <motion.div
                            key="student"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="analytics-content"
                        >
                            <StudentDetail student={selectedStudent ? { ...selectedStudent, ...(studentData || {}) } : null} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {loading && (
                    <div className="loading-overlay">
                        <div className="spinner"></div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Analytics;
