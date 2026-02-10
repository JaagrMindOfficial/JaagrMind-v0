import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    faPlus,
    faPaperPlane,
    faChevronDown,
    faChevronRight,
    faBuilding
} from '@fortawesome/free-solid-svg-icons';
import { Country, State, City } from 'country-state-city';
import Layout from '../../components/common/Layout';
import Background3D from '../../components/common/Background3D';
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

    const navigate = useNavigate();
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [expandedSchools, setExpandedSchools] = useState({}); // Track expanded super schools

    const [formData, setFormData] = useState({
        name: '',
        address: '', // Street address
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        confirmEmail: '', // For email confirmation
        isDataVisibleToSchool: false,
        sendEmail: true, // Send credentials email by default
        logo: null,
        type: 'super', // Default to super
        parentId: null
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

        // Validate email confirmation for new schools
        if (!editingSchool && formData.email !== formData.confirmEmail) {
            toast.error('Emails do not match! Please confirm the email address.');
            return;
        }

        // Validate Phone Number
        if (formData.phone && !/^[0-9]{10}$/.test(formData.phone)) {
            toast.error('Please enter a valid 10-digit phone number');
            return;
        }

        // Validate Email Format
        if (formData.email && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        const form = new FormData();
        form.append('name', formData.name);
        form.append('address', formData.address); // Street
        form.append('city', formData.city);
        form.append('state', formData.state);
        form.append('pincode', formData.pincode);
        form.append('type', formData.type);
        if (formData.parentId) form.append('parentId', formData.parentId);
        form.append('phone', formData.phone);
        form.append('email', formData.email);
        form.append('isDataVisibleToSchool', formData.isDataVisibleToSchool);
        form.append('sendEmail', formData.sendEmail); // Add sendEmail option
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
                    password: response.data.password,
                    emailSent: response.data.credentialsEmailSent
                });
                if (response.data.credentialsEmailSent) {
                    toast.success('School created and credentials email sent!');
                }
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
                address: school.address?.street || school.address || '',
                city: school.address?.city || '',
                state: school.address?.state || '',
                pincode: school.address?.pincode || '',
                phone: school.contact?.phone || '',
                email: school.email || school.contact?.email || '',
                confirmEmail: '', // Not needed for editing
                isDataVisibleToSchool: school.isDataVisibleToSchool,
                sendEmail: false, // Don't send email when editing
                logo: null,
                type: school.type || 'super',
                parentId: school.parentId
            });
        } else {
            setEditingSchool(null);
            setFormData({
                name: '',
                address: '',
                city: '',
                state: '',
                pincode: '',
                phone: '',
                email: '',
                confirmEmail: '',
                isDataVisibleToSchool: false,
                sendEmail: true, // Default to send email for new schools
                logo: null,
                type: 'super',
                parentId: null
            });
        }
        setCredentials(null);
        setShowModal(true);
    };

    const openBranchModal = (parentSchool) => {
        setEditingSchool(null);
        setFormData({
            name: '',
            address: parentSchool.address?.street || '',
            city: parentSchool.address?.city || '',
            state: parentSchool.address?.state || '',
            pincode: parentSchool.address?.pincode || '',
            phone: '',
            email: '',
            confirmEmail: '',
            isDataVisibleToSchool: parentSchool.isDataVisibleToSchool,
            sendEmail: true,
            logo: null,
            type: 'sub',
            parentId: parentSchool._id
        });
        setCredentials(null);
        setShowModal(true);
    };

    const toggleExpand = (schoolId) => {
        setExpandedSchools(prev => ({
            ...prev,
            [schoolId]: !prev[schoolId]
        }));
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSchool(null);
        setCredentials(null);
        setFormData({
            name: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            phone: '',
            email: '',
            confirmEmail: '',
            isDataVisibleToSchool: false,
            sendEmail: true,
            logo: null,
            type: 'super',
            parentId: null
        });
    };

    // Send or resend credentials email
    const handleSendCredentials = async (school, regenerate = false) => {
        try {
            const response = await api.post(`/api/admin/schools/${school._id}/send-credentials`, {
                regeneratePassword: regenerate
            });
            if (response.data.success) {
                toast.success(regenerate
                    ? 'New password generated and email sent!'
                    : 'Credentials email sent successfully!');
                fetchSchools();
            }
        } catch (error) {
            console.error('Error sending credentials:', error);
            toast.error(error.response?.data?.message || 'Failed to send email');
        }
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

    const handleViewAnalytics = (school) => {
        navigate(`/admin/analytics?schoolId=${school._id}`);
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
        <Layout title="School Management" subtitle="Manage schools and branches">
            <Background3D />
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

            {/* Schools Table Table */}
            <div className="school-table-container">
                <table className="school-table">
                    <thead>
                        <tr>
                            <th width="25%">School</th>
                            <th width="15%">Location</th>
                            <th width="20%">Stats (Students / Check-ins / Tests)</th>
                            <th width="20%">Credentials</th>
                            <th width="10%">Access</th>
                            <th width="10%">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSchools.map((school) => (
                            <>
                                <tr key={school._id}>
                                    <td>
                                        <div className="school-info-cell">
                                            <div className="school-logo-sm">
                                                {school.logo ? (
                                                    <img src={school.logo} alt={school.name} />
                                                ) : (
                                                    <span>{school.name[0]}</span>
                                                )}
                                            </div>
                                            <div className="school-details">
                                                <div
                                                    className="school-name-link"
                                                    onClick={() => school.branches?.length > 0 && toggleExpand(school._id)}
                                                    title={school.name}
                                                >
                                                    {school.name}
                                                    {school.branches?.length > 0 && (
                                                        <FontAwesomeIcon
                                                            icon={expandedSchools[school._id] ? faChevronDown : faChevronRight}
                                                            style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}
                                                        />
                                                    )}
                                                </div>
                                                <div className="school-id-badge" title={school.schoolId}>{school.schoolId}</div>
                                                {school.isBlocked && <span style={{ color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 600 }}>BLOCKED</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div title={`${school.address?.city}, ${school.address?.state}`}>
                                            {school.address?.city}, {school.address?.state}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="stats-cell">
                                            <div className="mini-stat">
                                                <span className="mini-stat-value">{school.studentCount || 0}</span>
                                                <span className="mini-stat-label">Stud.</span>
                                            </div>
                                            <div className="mini-stat">
                                                <span className="mini-stat-value">{school.submissionCount || 0}</span>
                                                <span className="mini-stat-label">Chk-in</span>
                                            </div>
                                            <div className="mini-stat">
                                                <span className="mini-stat-value">{school.assignedTests?.length || 0}</span>
                                                <span className="mini-stat-label">Tests</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-dark)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={school.email}>
                                                {school.email || 'Not set'}
                                            </span>
                                            {school.email && (
                                                <button
                                                    className="copy-btn"
                                                    onClick={() => handleSendCredentials(school, false)}
                                                    title="Resend Credentials Email"
                                                >
                                                    <FontAwesomeIcon icon={faPaperPlane} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${school.isDataVisibleToSchool ? 'badge-success' : 'badge-warning'}`}>
                                            {school.isDataVisibleToSchool ? 'Visible' : 'Hidden'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-cell">
                                            <button
                                                className="table-action-btn"
                                                onClick={() => openBranchModal(school)}
                                                title="Add Branch"
                                            >
                                                <FontAwesomeIcon icon={faPlus} />
                                            </button>
                                            <button
                                                className="table-action-btn edit"
                                                onClick={() => openModal(school)}
                                                title="Edit School"
                                            >
                                                <FontAwesomeIcon icon={faPenToSquare} />
                                            </button>
                                            <button
                                                className="table-action-btn edit"
                                                onClick={() => openCredentialsModal(school)}
                                                title="Edit Credentials"
                                            >
                                                <FontAwesomeIcon icon={faKey} />
                                            </button>
                                            <button
                                                className="table-action-btn edit"
                                                onClick={() => openTestsModal(school)}
                                                title="Manage Check-ins"
                                            >
                                                <FontAwesomeIcon icon={faClipboardList} />
                                            </button>
                                            <button
                                                className="table-action-btn edit"
                                                onClick={() => handleViewAnalytics(school)}
                                                title="View Insights"
                                            >
                                                <FontAwesomeIcon icon={faChartLine} />
                                            </button>
                                            <button
                                                className={`table-action-btn ${school.isBlocked ? 'success' : 'delete'}`}
                                                onClick={() => handleToggleBlock(school)}
                                                title={school.isBlocked ? 'Unblock' : 'Block'}
                                            >
                                                <FontAwesomeIcon icon={school.isBlocked ? faCircleCheck : faBan} />
                                            </button>
                                            <button
                                                className="table-action-btn delete"
                                                onClick={() => handleDelete(school._id)}
                                                title="Delete School"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expandedSchools[school._id] && school.branches && school.branches.length > 0 && (
                                    <tr className="branch-row">
                                        <td colSpan="6">
                                            <div className="branches-container">
                                                <h5 style={{ marginBottom: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                    Branches ({school.branches.length})
                                                </h5>
                                                <table className="branches-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Branch Name</th>
                                                            <th>Location</th>
                                                            <th>Students</th>
                                                            <th>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {school.branches.map((branch) => (
                                                            <tr key={branch._id}>
                                                                <td>{branch.name}</td>
                                                                <td>{branch.address?.city}, {branch.address?.state}</td>
                                                                <td>{branch.stats?.studentCount || 0}</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                                        <button
                                                                            className="table-action-btn edit"
                                                                            onClick={() => handleViewAnalytics(branch)}
                                                                            title="View Insights"
                                                                        >
                                                                            <FontAwesomeIcon icon={faChartLine} />
                                                                        </button>
                                                                        <button
                                                                            className="table-action-btn edit"
                                                                            onClick={() => openModal(branch)}
                                                                            title="Edit Branch"
                                                                        >
                                                                            <FontAwesomeIcon icon={faPenToSquare} />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>

                {filteredSchools.length === 0 && schools.length > 0 && (
                    <div className="empty-state card" style={{ boxShadow: 'none' }}>
                        <div className="empty-state-icon"><FontAwesomeIcon icon={faSearch} /></div>
                        <h3 className="empty-state-title">No Results Found</h3>
                        <p className="empty-state-text">No schools match "{searchQuery}"</p>
                        <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                            Clear Search
                        </button>
                    </div>
                )}

                {schools.length === 0 && (
                    <div className="empty-state card" style={{ boxShadow: 'none' }}>
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
                                    {credentials ? '✅ Registered!' : editingSchool ? 'Edit School' : formData.type === 'sub' ? 'Add Branch' : 'Register New School'}
                                </h2>
                                <button className="modal-close" onClick={closeModal}>×</button>
                            </div>

                            <div className="modal-body">
                                {credentials ? (
                                    <div className="credentials-display">
                                        <p className="credentials-note">
                                            ✅ School registered successfully! Credentials have been saved.
                                        </p>
                                        <div className="credential-item">
                                            <label>Login Email</label>
                                            <div className="credential-value">{formData.email}</div>
                                        </div>
                                        <div className="credential-item">
                                            <label>School ID</label>
                                            <div className="credential-value">{credentials.schoolId}</div>
                                        </div>
                                        {credentials.emailSent && (
                                            <p style={{ color: 'var(--success)', textAlign: 'center', marginTop: '12px' }}>
                                                📧 Login credentials sent to {formData.email}
                                            </p>
                                        )}
                                        <button
                                            className="btn btn-primary"
                                            style={{ marginTop: '16px' }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(
                                                    `Email: ${formData.email}\nSchool ID: ${credentials.schoolId}`
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
                                            <label className="form-label">Location (India)</label>
                                            <div className="form-row">
                                                <select
                                                    className="form-input"
                                                    value={formData.state}
                                                    onChange={(e) => setFormData({ ...formData, state: e.target.value, city: '' })}
                                                    required
                                                >
                                                    <option value="">Select State</option>
                                                    {State.getStatesOfCountry('IN').map((state) => (
                                                        <option key={state.isoCode} value={state.isoCode}>{state.name}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className="form-input"
                                                    value={formData.city}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                    required
                                                    disabled={!formData.state}
                                                >
                                                    <option value="">Select City</option>
                                                    {formData.state && City.getCitiesOfState('IN', formData.state).map((city) => (
                                                        <option key={city.name} value={city.name}>{city.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-row" style={{ marginTop: '10px' }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formData.pincode}
                                                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                                    placeholder="Pincode"
                                                    maxLength="6"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Full Address / Street</label>
                                            <textarea
                                                className="form-input"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="Enter street, building, area..."
                                                rows="2"
                                                required
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
                                                <label className="form-label">Email {!editingSchool && '*'}</label>
                                                <input
                                                    type="email"
                                                    className="form-input"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="Email address (used for login)"
                                                    required={!editingSchool}
                                                />
                                            </div>
                                        </div>

                                        {/* Confirm Email - Only for new schools */}
                                        {!editingSchool && (
                                            <div className="form-group">
                                                <label className="form-label">Confirm Email *</label>
                                                <input
                                                    type="email"
                                                    className="form-input"
                                                    value={formData.confirmEmail}
                                                    onChange={(e) => setFormData({ ...formData, confirmEmail: e.target.value })}
                                                    placeholder="Re-enter email address"
                                                    required
                                                    style={{
                                                        borderColor: formData.confirmEmail && formData.email !== formData.confirmEmail
                                                            ? 'var(--danger)'
                                                            : formData.confirmEmail && formData.email === formData.confirmEmail
                                                                ? 'var(--success)'
                                                                : undefined
                                                    }}
                                                />
                                                {formData.confirmEmail && formData.email !== formData.confirmEmail && (
                                                    <small style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>
                                                        Emails do not match
                                                    </small>
                                                )}
                                                {formData.confirmEmail && formData.email === formData.confirmEmail && (
                                                    <small style={{ color: 'var(--success)', fontSize: '0.8rem' }}>
                                                        ✓ Emails match
                                                    </small>
                                                )}
                                            </div>
                                        )}
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
                                                <span>Allow school to view student insights</span>
                                            </label>
                                        </div>

                                        {!editingSchool && (
                                            <div className="form-group">
                                                <label className="form-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.sendEmail}
                                                        onChange={(e) => setFormData({ ...formData, sendEmail: e.target.checked })}
                                                    />
                                                    <span>📧 Send login credentials to school email</span>
                                                </label>
                                            </div>
                                        )}

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
                                    📋 Manage Check-ins - {managingSchool.name}
                                </h2>
                                <button className="modal-close" onClick={closeTestsModal}>×</button>
                            </div>

                            <div className="modal-body">
                                <p className="text-muted" style={{ marginBottom: '1rem' }}>
                                    Select which check-ins should be available to this school.
                                </p>

                                <div className="form-group">
                                    <label className="form-checkbox assign-all-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={assignAll}
                                            onChange={(e) => handleAssignAll(e.target.checked)}
                                        />
                                        <span><strong>Assign All Check-ins</strong></span>
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
                                                {assessment.questionCount || assessment.questions?.length || 0} items
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {assessments.length === 0 && (
                                    <div className="empty-state">
                                        <p>No check-ins available. Create check-ins first.</p>
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


        </Layout >
    );
};

export default SchoolManagement;
