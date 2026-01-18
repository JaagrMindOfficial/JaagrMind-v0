import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsersGear, faRotateRight, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';
import './SchoolTests.css';

const SchoolTests = () => {
    const toast = useToast();
    const [tests, setTests] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTest, setSelectedTest] = useState(null);
    const [testStatus, setTestStatus] = useState([]);
    const [copiedLink, setCopiedLink] = useState(null);
    const [filterClass, setFilterClass] = useState('');
    const [filterSection, setFilterSection] = useState('');
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignTarget, setAssignTarget] = useState({ type: 'all', class: '', section: '' });
    const [assigning, setAssigning] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectAll, setSelectAll] = useState(false);

    useEffect(() => {
        fetchTests();
        fetchClasses();
    }, []);

    const fetchTests = async () => {
        try {
            const response = await api.get('/api/school/tests');
            setTests(response.data);
            if (response.data.length > 0) {
                setSelectedTest(response.data[0]);
                fetchTestStatus(response.data[0]._id);
            }
        } catch (error) {
            console.error('Error fetching tests:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async () => {
        try {
            const response = await api.get('/api/school/classes');
            setClasses(response.data.classes || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
        }
    };

    const fetchTestStatus = async (assessmentId, classFilter = '', sectionFilter = '') => {
        try {
            let url = `/api/school/test-status?assessmentId=${assessmentId}`;
            if (classFilter) url += `&class=${classFilter}`;
            if (sectionFilter) url += `&section=${sectionFilter}`;
            const response = await api.get(url);
            setTestStatus(response.data);
            setSelectedStudents([]);
            setSelectAll(false);
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    };

    const handleFilterChange = (classVal, sectionVal) => {
        setFilterClass(classVal);
        setFilterSection(sectionVal);
        if (selectedTest) {
            fetchTestStatus(selectedTest._id, classVal, sectionVal);
        }
    };

    const handleCopyLink = async (test) => {
        try {
            const response = await api.get(`/api/school/assessment-link/${test._id}`);
            await navigator.clipboard.writeText(response.data.link);
            setCopiedLink(test._id);
            setTimeout(() => setCopiedLink(null), 2000);
        } catch (error) {
            toast.error('Error copying link');
        }
    };

    const handleResetTest = async (studentId) => {
        if (!selectedTest) return;
        if (!window.confirm('Reset this student\'s test? They will need to take it again.')) return;

        try {
            await api.put(`/api/school/students/${studentId}/reset`, {
                assessmentId: selectedTest._id
            });
            fetchTestStatus(selectedTest._id, filterClass, filterSection);
        } catch (error) {
            toast.error('Error resetting test');
        }
    };

    const handleAssignTest = async () => {
        if (!selectedTest) return;
        setAssigning(true);
        try {
            await api.post('/api/school/tests/assign', {
                assessmentId: selectedTest._id,
                targetType: assignTarget.type === 'all' ? 'class' : assignTarget.type,
                targetClass: assignTarget.class || undefined,
                targetSection: assignTarget.section || undefined
            });
            toast.success('Test assigned successfully!');
            setShowAssignModal(false);
            fetchTestStatus(selectedTest._id, filterClass, filterSection);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error assigning test');
        } finally {
            setAssigning(false);
        }
    };

    const handleAssignToSelected = async () => {
        if (!selectedTest || selectedStudents.length === 0) return;
        setAssigning(true);
        try {
            await api.post('/api/school/tests/assign', {
                assessmentId: selectedTest._id,
                targetType: 'students',
                studentIds: selectedStudents
            });
            toast.success(`Test assigned to ${selectedStudents.length} students!`);
            fetchTestStatus(selectedTest._id, filterClass, filterSection);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error assigning test');
        } finally {
            setAssigning(false);
        }
    };

    const handleUnassignFromSelected = async () => {
        if (!selectedTest || selectedStudents.length === 0) return;
        if (!window.confirm(`Unassign test from ${selectedStudents.length} students?`)) return;
        setAssigning(true);
        try {
            await api.post('/api/school/tests/unassign', {
                assessmentId: selectedTest._id,
                studentIds: selectedStudents
            });
            toast.success('Test unassigned from selected students');
            fetchTestStatus(selectedTest._id, filterClass, filterSection);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error unassigning test');
        } finally {
            setAssigning(false);
        }
    };

    const toggleStudentSelection = (studentId) => {
        if (selectedStudents.includes(studentId)) {
            setSelectedStudents(selectedStudents.filter(id => id !== studentId));
        } else {
            setSelectedStudents([...selectedStudents, studentId]);
        }
    };

    const handleSelectAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            setSelectedStudents(testStatus.map(s => s._id));
        } else {
            setSelectedStudents([]);
        }
    };

    if (loading) {
        return (
            <Layout title="Test Management">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    const uniqueClasses = [...new Set(classes.map(c => c._id.class))];
    const sectionsForClass = filterClass
        ? [...new Set(classes.filter(c => c._id.class === filterClass).map(c => c._id.section))]
        : [];

    const completedCount = testStatus.filter(s => s.status === 'Completed').length;
    const pendingCount = testStatus.filter(s => s.status === 'Pending').length;

    return (
        <Layout title="Test Management" subtitle="Manage assessments and track progress">
            {/* Test Cards */}
            <div className="tests-overview">
                {tests.map((test, index) => (
                    <motion.div
                        key={test._id}
                        className={`test-card ${selectedTest?._id === test._id ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedTest(test);
                            fetchTestStatus(test._id, filterClass, filterSection);
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                    >
                        <div className="test-card-icon">📝</div>
                        <div className="test-card-info">
                            <h3>{test.title}</h3>
                            <p>{test.isDefault ? 'Default Assessment' : 'Custom Assessment'}</p>
                        </div>
                        <motion.button
                            className={`btn btn-sm ${copiedLink === test._id ? 'btn-success' : 'btn-secondary'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(test);
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {copiedLink === test._id ? '✓ Copied!' : '🔗 Copy Link'}
                        </motion.button>
                    </motion.div>
                ))}
            </div>

            {selectedTest && (
                <>
                    {/* Stats and Actions */}
                    <div className="test-actions-bar">
                        <div className="test-stats">
                            <div className="test-stat">
                                <span className="test-stat-value text-success">{completedCount}</span>
                                <span className="test-stat-label">Completed</span>
                            </div>
                            <div className="test-stat">
                                <span className="test-stat-value text-warning">{pendingCount}</span>
                                <span className="test-stat-label">Pending</span>
                            </div>
                            <div className="test-stat">
                                <span className="test-stat-value">{testStatus.length}</span>
                                <span className="test-stat-label">Total Students</span>
                            </div>
                        </div>
                        <div className="test-actions-buttons">
                            {selectedStudents.length > 0 && (
                                <>
                                    <button
                                        className="btn btn-success btn-sm"
                                        onClick={handleAssignToSelected}
                                        disabled={assigning}
                                    >
                                        <FontAwesomeIcon icon={faCheck} /> Assign to {selectedStudents.length}
                                    </button>
                                    <button
                                        className="btn btn-danger btn-sm"
                                        onClick={handleUnassignFromSelected}
                                        disabled={assigning}
                                    >
                                        <FontAwesomeIcon icon={faXmark} /> Unassign from {selectedStudents.length}
                                    </button>
                                </>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowAssignModal(true)}
                            >
                                <FontAwesomeIcon icon={faUsersGear} /> Bulk Assign
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="test-filters card">
                        <div className="filter-row">
                            <select
                                className="form-input"
                                value={filterClass}
                                onChange={(e) => handleFilterChange(e.target.value, '')}
                            >
                                <option value="">All Classes</option>
                                {uniqueClasses.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            {filterClass && (
                                <select
                                    className="form-input"
                                    value={filterSection}
                                    onChange={(e) => handleFilterChange(filterClass, e.target.value)}
                                >
                                    <option value="">All Sections</option>
                                    {sectionsForClass.map(s => (
                                        <option key={s} value={s}>{s || 'No Section'}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Status Table */}
                    <motion.div
                        className="card"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        <div className="card-header">
                            <h3 className="card-title">Student Test Status</h3>
                            <span className="text-muted">
                                {selectedStudents.length > 0 && `${selectedStudents.length} selected`}
                            </span>
                        </div>

                        {testStatus.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '40px' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                                />
                                            </th>
                                            <th>Student Name</th>
                                            <th>Access ID</th>
                                            <th>Class</th>
                                            <th>Status</th>
                                            <th>Completed At</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {testStatus.map((student) => (
                                            <tr
                                                key={student._id}
                                                className={selectedStudents.includes(student._id) ? 'selected-row' : ''}
                                            >
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(student._id)}
                                                        onChange={() => toggleStudentSelection(student._id)}
                                                    />
                                                </td>
                                                <td className="font-medium">{student.name}</td>
                                                <td>
                                                    <code className="access-id-code">{student.accessId}</code>
                                                </td>
                                                <td>{student.class} {student.section}</td>
                                                <td>
                                                    <span className={`badge ${student.status === 'Completed' ? 'badge-success' : 'badge-warning'
                                                        }`}>
                                                        {student.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {student.completedAt
                                                        ? new Date(student.completedAt).toLocaleString()
                                                        : '-'
                                                    }
                                                </td>
                                                <td>
                                                    {student.status === 'Completed' && (
                                                        <button
                                                            className="btn btn-outline btn-sm"
                                                            onClick={() => handleResetTest(student._id)}
                                                        >
                                                            <FontAwesomeIcon icon={faRotateRight} /> Reset
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <p>No students found for this test</p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}

            {/* Assign Test Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <motion.div
                        className="modal"
                        onClick={e => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div className="modal-header">
                            <h2>Bulk Assign Test to Students</h2>
                            <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Assignment Type</label>
                                <select
                                    className="form-input"
                                    value={assignTarget.type}
                                    onChange={(e) => setAssignTarget({ ...assignTarget, type: e.target.value })}
                                >
                                    <option value="all">All Students</option>
                                    <option value="class">By Class</option>
                                    <option value="section">By Class & Section</option>
                                </select>
                            </div>

                            {(assignTarget.type === 'class' || assignTarget.type === 'section') && (
                                <div className="form-group">
                                    <label className="form-label">Class</label>
                                    <select
                                        className="form-input"
                                        value={assignTarget.class}
                                        onChange={(e) => setAssignTarget({ ...assignTarget, class: e.target.value })}
                                    >
                                        <option value="">Select Class</option>
                                        {uniqueClasses.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {assignTarget.type === 'section' && assignTarget.class && (
                                <div className="form-group">
                                    <label className="form-label">Section</label>
                                    <select
                                        className="form-input"
                                        value={assignTarget.section}
                                        onChange={(e) => setAssignTarget({ ...assignTarget, section: e.target.value })}
                                    >
                                        <option value="">Select Section</option>
                                        {classes.filter(c => c._id.class === assignTarget.class).map(c => (
                                            <option key={c._id.section} value={c._id.section}>
                                                {c._id.section || 'No Section'} ({c.count} students)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAssignTest}
                                disabled={assigning || (assignTarget.type !== 'all' && !assignTarget.class)}
                            >
                                {assigning ? 'Assigning...' : 'Assign Test'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </Layout>
    );
};

export default SchoolTests;
