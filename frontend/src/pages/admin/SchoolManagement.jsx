import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faKey,
    faClipboardList,
    faChartLine,
    faPenToSquare,
    faBan,
    faCircleCheck,
    faTrash,
    faCopy,
    faSchool,
    faSearch,
    faPlus
} from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import Pagination from '../../components/common/Pagination';
import { useToast } from '../../components/common/Toast';
import api from '../../services/api';
import './SchoolManagement.css';

const SchoolManagement = () => {
    const toast = useToast();
    const [schools, setSchools] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showTestsModal, setShowTestsModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [editingSchool, setEditingSchool] = useState(null);
    const [managingSchool, setManagingSchool] = useState(null);
    const [credentialsSchool, setCredentialsSchool] = useState(null);
    const [credentials, setCredentials] = useState(null);
    const [selectedTests, setSelectedTests] = useState([]);
    const [assignAll, setAssignAll] = useState(false);
    const [savingTests, setSavingTests] = useState(false);
    const [savingCredentials, setSavingCredentials] = useState(false);
    const [credentialsForm, setCredentialsForm] = useState({ schoolId: '', password: '' });
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [analyticsSchool, setAnalyticsSchool] = useState(null);
    const [analyticsData, setAnalyticsData] = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsFilters, setAnalyticsFilters] = useState({ class: '', section: '', assessmentId: '', search: '' });
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        isDataVisibleToSchool: false,
        logo: null
    });

    useEffect(() => {
        fetchSchools();
        fetchAssessments();
    }, []);

    const fetchSchools = async (page = 1) => {
        try {
            const response = await api.get(`/api/admin/schools?page=${page}&limit=10`);
            // Handle both paginated and non-paginated responses for backwards compatibility
            if (response.data.data) {
                setSchools(response.data.data);
                setPagination(response.data.pagination);
            } else {
                setSchools(response.data);
            }
        } catch (error) {
            console.error('Error fetching schools:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssessments = async () => {
        try {
            const response = await api.get('/api/admin/assessments');
            setAssessments(response.data);
        } catch (error) {
            console.error('Error fetching assessments:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const form = new FormData();
        form.append('name', formData.name);
        form.append('address', formData.address);
        form.append('phone', formData.phone);
        form.append('email', formData.email);
        form.append('isDataVisibleToSchool', formData.isDataVisibleToSchool);
        if (formData.logo) {
            form.append('logo', formData.logo);
        }

        try {
            let response;
            if (editingSchool) {
                response = await api.put(`/api/admin/schools/${editingSchool._id}`, form, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                response = await api.post('/api/admin/schools', form, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                setCredentials({
                    schoolId: response.data.schoolId,
                    password: response.data.password
                });
            }

            fetchSchools();
            if (!editingSchool) {
                // Keep modal open to show credentials
            } else {
                closeModal();
            }
        } catch (error) {
            console.error('Error saving school:', error);
            toast.error(error.response?.data?.message || 'Error saving school');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this school?')) return;

        try {
            await api.delete(`/api/admin/schools/${id}`);
            fetchSchools();
        } catch (error) {
            console.error('Error deleting school:', error);
        }
    };

    const handleToggleBlock = async (school) => {
        try {
            await api.put(`/api/admin/schools/${school._id}/block`, {
                isBlocked: !school.isBlocked
            });
            fetchSchools();
        } catch (error) {
            console.error('Error toggling block:', error);
            toast.error(error.response?.data?.message || 'Error');
        }
    };

    const openModal = (school = null) => {
        if (school) {
            setEditingSchool(school);
            setFormData({
                name: school.name,
                address: school.address || '',
                phone: school.contact?.phone || '',
                email: school.contact?.email || '',
                isDataVisibleToSchool: school.isDataVisibleToSchool,
                logo: null
            });
        } else {
            setEditingSchool(null);
            setFormData({
                name: '',
                address: '',
                phone: '',
                email: '',
                isDataVisibleToSchool: false,
                logo: null
            });
        }
        setCredentials(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSchool(null);
        setCredentials(null);
        setFormData({
            name: '',
            address: '',
            phone: '',
            email: '',
            isDataVisibleToSchool: false,
            logo: null
        });
    };

    const openTestsModal = (school) => {
        setManagingSchool(school);
        const currentTests = school.assignedTests?.map(t => t._id) || [];
        setSelectedTests(currentTests);
        setAssignAll(currentTests.length === assessments.length && assessments.length > 0);
        setShowTestsModal(true);
    };

    const closeTestsModal = () => {
        setShowTestsModal(false);
        setManagingSchool(null);
        setSelectedTests([]);
        setAssignAll(false);
    };

    const openCredentialsModal = (school) => {
        setCredentialsSchool(school);
        setCredentialsForm({
            schoolId: school.schoolId,
            password: ''
        });
        setShowCredentialsModal(true);
    };

    const closeCredentialsModal = () => {
        setShowCredentialsModal(false);
        setCredentialsSchool(null);
        setCredentialsForm({ schoolId: '', password: '' });
    };

    const handleSaveCredentials = async () => {
        if (!credentialsSchool) return;
        setSavingCredentials(true);
        try {
            const payload = {};
            if (credentialsForm.schoolId !== credentialsSchool.schoolId) {
                payload.schoolId = credentialsForm.schoolId;
            }
            if (credentialsForm.password) {
                payload.password = credentialsForm.password;
            }
            if (Object.keys(payload).length === 0) {
                closeCredentialsModal();
                return;
            }
            await api.put(`/api/admin/schools/${credentialsSchool._id}/credentials`, payload);
            await fetchSchools();
            closeCredentialsModal();
        } catch (error) {
            console.error('Error saving credentials:', error);
            toast.error(error.response?.data?.message || 'Error updating credentials');
        } finally {
            setSavingCredentials(false);
        }
    };

    const toggleTestSelection = (testId) => {
        if (selectedTests.includes(testId)) {
            setSelectedTests(selectedTests.filter(id => id !== testId));
            setAssignAll(false);
        } else {
            const newSelected = [...selectedTests, testId];
            setSelectedTests(newSelected);
            if (newSelected.length === assessments.length) {
                setAssignAll(true);
            }
        }
    };

    const handleAssignAll = (checked) => {
        setAssignAll(checked);
        if (checked) {
            setSelectedTests(assessments.map(a => a._id));
        } else {
            setSelectedTests([]);
        }
    };

    const handleSaveTests = async () => {
        if (!managingSchool) return;
        setSavingTests(true);
        try {
            await api.put(`/api/admin/schools/${managingSchool._id}/tests`, {
                assignedTests: selectedTests,
                assignAll: assignAll
            });
            await fetchSchools();
            closeTestsModal();
        } catch (error) {
            console.error('Error saving tests:', error);
            toast.error(error.response?.data?.message || 'Error updating tests');
        } finally {
            setSavingTests(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    const openAnalyticsModal = async (school) => {
        setAnalyticsSchool(school);
        setAnalyticsFilters({ class: '', section: '', assessmentId: '', search: '' });
        setShowAnalyticsModal(true);
        await fetchAnalyticsData(school._id, {});
    };

    const closeAnalyticsModal = () => {
        setShowAnalyticsModal(false);
        setAnalyticsSchool(null);
        setAnalyticsData(null);
    };

    const fetchAnalyticsData = async (schoolId, filters) => {
        setAnalyticsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.class) params.append('class', filters.class);
            if (filters.section) params.append('section', filters.section);
            if (filters.assessmentId) params.append('assessmentId', filters.assessmentId);
            if (filters.search) params.append('search', filters.search);
            const response = await api.get(`/api/admin/schools/${schoolId}/students-analytics?${params}`);
            setAnalyticsData(response.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleAnalyticsFilterChange = (key, value) => {
        const newFilters = { ...analyticsFilters, [key]: value };
        if (key === 'class') newFilters.section = '';
        setAnalyticsFilters(newFilters);
        if (analyticsSchool) {
            fetchAnalyticsData(analyticsSchool._id, newFilters);
        }
    };

    if (loading) {
        return (
            <Layout title="School Management">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading schools...</p>
                </div>
            </Layout>
        );
    }

    const filteredSchools = schools.filter(school =>
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.schoolId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Layout title="School Management" subtitle="Register and manage schools">
            <div className="page-header">
                <div className="search-bar">
                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="Search schools by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="header-info">
                    <span className="text-muted">{filteredSchools.length} of {schools.length} school(s)</span>
                </div>
                <motion.button
                    className="btn btn-primary"
                    onClick={() => openModal()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <FontAwesomeIcon icon={faPlus} /> Register School
                </motion.button>
            </div>

            {/* Schools Grid */}
            <div className="schools-grid">
                {filteredSchools.map((school, index) => (
                    <motion.div
                        key={school._id}
                        className={`school-card ${school.isBlocked ? 'blocked' : ''}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        {school.isBlocked && <div className="blocked-badge">BLOCKED</div>}

                        {/* Header: Logo + Name */}
                        <div className="school-card-header">
                            <div className="school-card-avatar">
                                {school.logo ? (
                                    <img src={school.logo} alt={school.name} />
                                ) : (
                                    <span>{school.name[0]}</span>
                                )}
                            </div>
                            <div className="school-card-info">
                                <h3 className="school-card-name">{school.name}</h3>
                                <span className="school-card-id">{school.schoolId}</span>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="school-card-stats">
                            <div className="school-stat">
                                <span className="school-stat-value">{school.studentCount || 0}</span>
                                <span className="school-stat-label">Students</span>
                            </div>
                            <div className="school-stat">
                                <span className="school-stat-value">{school.submissionCount || 0}</span>
                                <span className="school-stat-label">Submissions</span>
                            </div>
                            <div className="school-stat">
                                <span className="school-stat-value">{school.assignedTests?.length || 0}</span>
                                <span className="school-stat-label">Tests</span>
                            </div>
                        </div>

                        {/* Credentials Display */}
                        <div className="credentials-box">
                            <div className="credential-row">
                                <span className="credential-label">ID:</span>
                                <span className="credential-value">{school.schoolId}</span>
                                <button className="copy-btn" onClick={() => copyToClipboard(school.schoolId)}><FontAwesomeIcon icon={faCopy} /></button>
                            </div>
                            <div className="credential-row">
                                <span className="credential-label">Pass:</span>
                                <span className="credential-value">{school.plainPassword || '••••••••'}</span>
                                {school.plainPassword && (
                                    <button className="copy-btn" onClick={() => copyToClipboard(school.plainPassword)}><FontAwesomeIcon icon={faCopy} /></button>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons - Clean Horizontal Layout */}
                        <div className="school-card-actions">
                            <button
                                className="action-btn"
                                onClick={() => openCredentialsModal(school)}
                                title="Edit Credentials"
                            >
                                <FontAwesomeIcon icon={faKey} />
                            </button>
                            <button
                                className="action-btn"
                                onClick={() => openTestsModal(school)}
                                title="Manage Tests"
                            >
                                <FontAwesomeIcon icon={faClipboardList} />
                            </button>
                            <button
                                className="action-btn analytics"
                                onClick={() => openAnalyticsModal(school)}
                                title="View Analytics"
                            >
                                <FontAwesomeIcon icon={faChartLine} />
                            </button>
                            <button
                                className="action-btn"
                                onClick={() => openModal(school)}
                                title="Edit School"
                            >
                                <FontAwesomeIcon icon={faPenToSquare} />
                            </button>
                            <button
                                className={`action-btn ${school.isBlocked ? 'success' : 'warning'}`}
                                onClick={() => handleToggleBlock(school)}
                                title={school.isBlocked ? 'Unblock' : 'Block'}
                            >
                                <FontAwesomeIcon icon={school.isBlocked ? faCircleCheck : faBan} />
                            </button>
                            <button
                                className="action-btn danger"
                                onClick={() => handleDelete(school._id)}
                                title="Delete School"
                            >
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>

                        {/* Footer */}
                        <div className="school-card-footer">
                            <span className={`badge ${school.isDataVisibleToSchool ? 'badge-success' : 'badge-warning'}`}>
                                {school.isDataVisibleToSchool ? 'Data Visible' : 'Data Hidden'}
                            </span>
                        </div>
                    </motion.div>
                ))}

                {filteredSchools.length === 0 && schools.length > 0 && (
                    <div className="empty-state card">
                        <div className="empty-state-icon"><FontAwesomeIcon icon={faSearch} /></div>
                        <h3 className="empty-state-title">No Results Found</h3>
                        <p className="empty-state-text">No schools match "{searchQuery}"</p>
                        <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                            Clear Search
                        </button>
                    </div>
                )}

                {schools.length === 0 && (
                    <div className="empty-state card">
                        <div className="empty-state-icon"><FontAwesomeIcon icon={faSchool} /></div>
                        <h3 className="empty-state-title">No Schools Yet</h3>
                        <p className="empty-state-text">Register your first school to get started</p>
                        <button className="btn btn-primary" onClick={() => openModal()}>
                            Register School
                        </button>
                    </div>
                )}
            </div>

            {/* School Create/Edit Modal */}
            <AnimatePresence>
                {showModal && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeModal}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    {credentials ? '✅ School Registered!' : editingSchool ? 'Edit School' : 'Register New School'}
                                </h2>
                                <button className="modal-close" onClick={closeModal}>×</button>
                            </div>

                            <div className="modal-body">
                                {credentials ? (
                                    <div className="credentials-display">
                                        <p className="credentials-note">
                                            Save these credentials! They are also visible on the school card.
                                        </p>
                                        <div className="credential-item">
                                            <label>School ID</label>
                                            <div className="credential-value">{credentials.schoolId}</div>
                                        </div>
                                        <div className="credential-item">
                                            <label>Password</label>
                                            <div className="credential-value">{credentials.password}</div>
                                        </div>
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    `School ID: ${credentials.schoolId}\nPassword: ${credentials.password}`
                                                );
                                                toast.success('Credentials copied to clipboard!');
                                            }}
                                        >
                                            📋 Copy Credentials
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit}>
                                        <div className="form-group">
                                            <label className="form-label">School Name *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Enter school name"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Address</label>
                                            <textarea
                                                className="form-input"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="Enter address"
                                                rows="2"
                                            />
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label className="form-label">Phone</label>
                                                <input
                                                    type="tel"
                                                    className="form-input"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="Phone number"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Email</label>
                                                <input
                                                    type="email"
                                                    className="form-input"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="Email address"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">School Logo</label>
                                            <input
                                                type="file"
                                                className="form-input"
                                                accept="image/*"
                                                onChange={(e) => setFormData({ ...formData, logo: e.target.files[0] })}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.isDataVisibleToSchool}
                                                    onChange={(e) => setFormData({ ...formData, isDataVisibleToSchool: e.target.checked })}
                                                />
                                                <span>Allow school to view student analytics</span>
                                            </label>
                                        </div>

                                        <div className="modal-footer">
                                            <button type="button" className="btn btn-outline" onClick={closeModal}>
                                                Cancel
                                            </button>
                                            <button type="submit" className="btn btn-primary">
                                                {editingSchool ? 'Update School' : 'Register School'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Credentials Edit Modal */}
            <AnimatePresence>
                {showCredentialsModal && credentialsSchool && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeCredentialsModal}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    🔑 Edit Credentials - {credentialsSchool.name}
                                </h2>
                                <button className="modal-close" onClick={closeCredentialsModal}>×</button>
                            </div>

                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">School ID</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={credentialsForm.schoolId}
                                        onChange={(e) => setCredentialsForm({ ...credentialsForm, schoolId: e.target.value.toUpperCase() })}
                                        placeholder="School ID"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">New Password (leave empty to keep current)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={credentialsForm.password}
                                        onChange={(e) => setCredentialsForm({ ...credentialsForm, password: e.target.value })}
                                        placeholder="Enter new password"
                                    />
                                </div>

                                <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                                    Current password: <strong>{credentialsSchool.plainPassword || 'Not available'}</strong>
                                </p>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={closeCredentialsModal}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveCredentials}
                                    disabled={savingCredentials}
                                >
                                    {savingCredentials ? 'Saving...' : 'Save Credentials'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manage Tests Modal */}
            <AnimatePresence>
                {showTestsModal && managingSchool && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeTestsModal}
                    >
                        <motion.div
                            className="modal"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    📋 Manage Tests - {managingSchool.name}
                                </h2>
                                <button className="modal-close" onClick={closeTestsModal}>×</button>
                            </div>

                            <div className="modal-body">
                                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                                    Select which assessments should be available to this school.
                                </p>

                                <div className="form-group">
                                    <label className="form-checkbox assign-all-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={assignAll}
                                            onChange={(e) => handleAssignAll(e.target.checked)}
                                        />
                                        <span><strong>Assign All Assessments</strong></span>
                                    </label>
                                </div>

                                <div className="tests-checklist">
                                    {assessments.map((assessment) => (
                                        <div key={assessment._id} className="test-checkbox-item">
                                            <label className="form-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTests.includes(assessment._id)}
                                                    onChange={() => toggleTestSelection(assessment._id)}
                                                />
                                                <span>
                                                    {assessment.title}
                                                    {assessment.isDefault && (
                                                        <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>
                                                            Default
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                            <span className="test-question-count">
                                                {assessment.questionCount || assessment.questions?.length || 0} questions
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {assessments.length === 0 && (
                                    <div className="empty-state">
                                        <p>No assessments available. Create assessments first.</p>
                                    </div>
                                )}
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={closeTestsModal}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSaveTests}
                                    disabled={savingTests}
                                >
                                    {savingTests ? 'Saving...' : `Save (${selectedTests.length} selected)`}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Analytics Modal */}
            <AnimatePresence>
                {showAnalyticsModal && analyticsSchool && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeAnalyticsModal}
                    >
                        <motion.div
                            className="modal modal-xlarge"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    📊 {analyticsSchool.name} - Student Analytics
                                </h2>
                                <button className="modal-close" onClick={closeAnalyticsModal}>×</button>
                            </div>

                            {/* Filters - Fixed at top */}
                            <div className="analytics-filters">
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Search by name or ID..."
                                    value={analyticsFilters.search}
                                    onChange={(e) => handleAnalyticsFilterChange('search', e.target.value)}
                                    style={{ maxWidth: '200px' }}
                                />
                                <select
                                    className="form-input"
                                    value={analyticsFilters.class}
                                    onChange={(e) => handleAnalyticsFilterChange('class', e.target.value)}
                                    style={{ maxWidth: '150px' }}
                                >
                                    <option value="">All Classes</option>
                                    {analyticsData?.filters?.classes?.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                {analyticsFilters.class && (
                                    <select
                                        className="form-input"
                                        value={analyticsFilters.section}
                                        onChange={(e) => handleAnalyticsFilterChange('section', e.target.value)}
                                        style={{ maxWidth: '150px' }}
                                    >
                                        <option value="">All Sections</option>
                                        {analyticsData?.filters?.sections?.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                )}
                                <select
                                    className="form-input"
                                    value={analyticsFilters.assessmentId}
                                    onChange={(e) => handleAnalyticsFilterChange('assessmentId', e.target.value)}
                                    style={{ maxWidth: '200px' }}
                                >
                                    <option value="">All Assessments</option>
                                    {analyticsData?.filters?.assessments?.map(a => (
                                        <option key={a._id} value={a._id}>{a.title}</option>
                                    ))}
                                </select>
                                <span className="text-muted">
                                    {analyticsData?.totalStudents || 0} students
                                </span>
                            </div>

                            {/* Scrollable Table Content */}
                            <div className="modal-body modal-body-scroll">
                                {/* Student Table */}
                                {analyticsLoading ? (
                                    <div className="loading-container" style={{ padding: '40px' }}>
                                        <div className="spinner"></div>
                                    </div>
                                ) : analyticsData?.students?.length > 0 ? (
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
                                                {analyticsData.students.map(student => (
                                                    student.submissions?.length > 0 ? (
                                                        student.submissions.map((sub, idx) => (
                                                            <tr key={`${student._id}-${idx}`}>
                                                                {idx === 0 && (
                                                                    <>
                                                                        <td rowSpan={student.submissions.length} className="font-medium">{student.name}</td>
                                                                        <td rowSpan={student.submissions.length}><code className="access-id-code">{student.accessId}</code></td>
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
                                                            <td className="font-medium">{student.name}</td>
                                                            <td><code className="access-id-code">{student.accessId}</code></td>
                                                            <td>{student.class} {student.section}</td>
                                                            <td>{student.rollNo || '-'}</td>
                                                            <td colSpan="4" className="text-muted">No submissions yet</td>
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
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={closeAnalyticsModal}>
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout >
    );
};

export default SchoolManagement;
