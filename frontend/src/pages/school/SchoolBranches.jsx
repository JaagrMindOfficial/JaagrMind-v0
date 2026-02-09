import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faBuilding,
    faPlus,
    faSearch,
    faMapMarkerAlt,
    faPhone,
    faEnvelope,
    faUsers,
    faCopy,
    faEdit,
    faChartLine,
    faTrash
} from '@fortawesome/free-solid-svg-icons';
import { Country, State, City } from 'country-state-city';
import Layout from '../../components/common/Layout';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './SchoolDashboard.css'; // Reuse existing styles or create specific ones

const SchoolBranches = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [credentials, setCredentials] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        phone: '',
        email: '',
        confirmEmail: '',
        isDataVisibleToSchool: false,
        sendEmail: true
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const response = await api.get('/api/school/branches');
            setBranches(response.data);
        } catch (error) {
            console.error('Error fetching branches:', error);
            toast.error('Failed to load branches');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    const handleEdit = (branch) => {
        setFormData({
            id: branch._id,
            name: branch.name,
            address: branch.address?.street || '',
            city: branch.address?.city || '',
            state: branch.address?.state || '',
            pincode: branch.address?.pincode || '',
            phone: branch.contact?.phone || '',
            email: branch.email,
            confirmEmail: branch.email, // Assume verified
            isDataVisibleToSchool: branch.isDataVisibleToSchool,
            sendEmail: false
        });
        setShowModal(true);
    };

    const handleViewInsights = (branchId) => {
        window.location.href = `/school/analytics?schoolId=${branchId}`;
    };

    const handleDelete = async (branchId) => {
        if (window.confirm('Are you sure you want to delete this branch? This action cannot be undone.')) {
            try {
                await api.delete(`/api/school/branches/${branchId}`);
                toast.success('Branch deleted successfully');
                fetchBranches();
            } catch (error) {
                console.error('Error deleting branch:', error);
                toast.error(error.response?.data?.message || 'Error deleting branch');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (formData.email !== formData.confirmEmail) {
            toast.error('Emails do not match!');
            return;
        }

        setSaving(true);
        try {
            if (formData.id) {
                // Update existing branch
                await api.put(`/api/school/branches/${formData.id}`, {
                    name: formData.name,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.pincode,
                    phone: formData.phone,
                    // Email usually not editable here or handled separately
                });
                toast.success('Branch updated successfully!');
            } else {
                // Create new branch
                const response = await api.post('/api/school/branches', {
                    name: formData.name,
                    address: formData.address,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.pincode,
                    phone: formData.phone,
                    email: formData.email,
                    isDataVisibleToSchool: formData.isDataVisibleToSchool,
                    sendEmail: formData.sendEmail
                });

                setCredentials({
                    schoolId: response.data.branch.schoolId,
                    email: response.data.branch.email,
                    emailSent: true
                });
                toast.success('Branch created successfully!');
            }

            fetchBranches();
            if (formData.id) closeModal(); // Close modal immediately for edit
        } catch (error) {
            console.error('Error saving branch:', error);
            toast.error(error.response?.data?.message || 'Error saving branch');
            setSaving(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setCredentials(null);
        setSaving(false);
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
            sendEmail: true
        });
    };

    const filteredBranches = branches.filter(branch =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.schoolId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <Layout title="Branch Management">
                <div className="loading-container">
                    <div className="spinner"></div>
                </div>
            </Layout>
        );
    }

    if (user?.type === 'sub') {
        return (
            <Layout title="Branch Management">
                <div className="empty-state card">
                    <h3>Access Denied</h3>
                    <p>Branch management is only available for Super Schools.</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Branch Management" subtitle="Manage your school branches">
            <div className="page-header">
                <div className="search-bar">
                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="Search branches..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <motion.button
                    className="btn btn-primary"
                    onClick={() => setShowModal(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <FontAwesomeIcon icon={faPlus} /> Add New Branch
                </motion.button>
            </div>

            <div className="schools-grid">
                {filteredBranches.map((branch, index) => (
                    <motion.div
                        key={branch._id}
                        className="school-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        style={{ position: 'relative' }} // For absolute positioning of delete button
                    >
                        {/* Delete Button - Top Right */}
                        <button
                            className="btn-icon-delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(branch._id);
                            }}
                            title="Delete Branch"
                        >
                            <FontAwesomeIcon icon={faTrash} />
                        </button>

                        <div className="school-card-header">
                            <div className="school-card-avatar">
                                <span>{branch.name[0]}</span>
                            </div>
                            <div className="school-card-info">
                                <h3 className="school-card-name" title={branch.name}>{branch.name}</h3>
                                <span className="school-card-id">{branch.schoolId}</span>
                                <span className="school-address-sm">
                                    {branch.address?.city && branch.address?.state
                                        ? `${branch.address.city}, ${branch.address.state}`
                                        : 'No Address'}
                                </span>
                            </div>
                        </div>

                        <div className="school-card-stats">
                            <div className="school-stat">
                                <span className="school-stat-value">{branch.stats?.studentCount || 0}</span>
                                <span className="school-stat-label">Students</span>
                            </div>
                        </div>

                        <div className="credentials-box" style={{ margin: '12px 0 0', padding: '8px' }}>
                            <div className="credential-row">
                                <FontAwesomeIcon icon={faEnvelope} className="text-muted" />
                                <span style={{ fontSize: '0.85rem', marginLeft: '6px' }} title={branch.email}>
                                    {branch.email.length > 25 ? branch.email.substring(0, 22) + '...' : branch.email}
                                </span>
                            </div>
                        </div>

                        <div className="school-card-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                            <button
                                className="btn btn-outline btn-sm action-btn"
                                onClick={() => handleEdit(branch)}
                            >
                                <FontAwesomeIcon icon={faEdit} /> Edit
                            </button>
                            <button
                                className="btn btn-primary btn-sm action-btn"
                                onClick={() => handleViewInsights(branch._id)}
                            >
                                <FontAwesomeIcon icon={faChartLine} /> Insights
                            </button>
                        </div>
                    </motion.div>
                ))}

                {filteredBranches.length === 0 && (
                    <div className="empty-state card" style={{ gridColumn: '1 / -1' }}>
                        <div className="empty-state-icon"><FontAwesomeIcon icon={faBuilding} /></div>
                        <h3>No Branches Found</h3>
                        <p>{branches.length === 0 ? "You haven't added any branches yet." : "No branches match your search."}</p>
                    </div>
                )}
            </div>

            {/* Add Branch Modal */}
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
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">
                                    {credentials ? '✅ Branch Created!' : (formData.id ? 'Edit Branch' : 'Add New Branch')}
                                </h2>
                                <button className="modal-close" onClick={closeModal}>×</button>
                            </div>

                            <div className="modal-body">
                                {credentials ? (
                                    <div className="credentials-display">
                                        <p className="credentials-note">
                                            ✅ Branch registered successfully! Credentials have been saved.
                                        </p>
                                        <div className="credential-item">
                                            <label>Login Email</label>
                                            <div className="credential-value">{credentials.email}</div>
                                        </div>
                                        <div className="credential-item">
                                            <label>School ID</label>
                                            <div className="credential-value">{credentials.schoolId}</div>
                                        </div>
                                        <p style={{ color: 'var(--success)', textAlign: 'center', marginTop: '12px' }}>
                                            📧 Login credentials sent to {credentials.email}
                                        </p>
                                        <button
                                            className="btn btn-primary"
                                            style={{ marginTop: '16px' }}
                                            onClick={() => handleCopy(`Email: ${credentials.email}\nSchool ID: ${credentials.schoolId}`)}
                                        >
                                            <FontAwesomeIcon icon={faCopy} /> Copy Credentials
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit}>
                                        <div className="form-group">
                                            <label>Branch Name *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                placeholder="e.g. North Campus"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Location (India)</label>
                                            <div className="form-row">
                                                <select
                                                    className="form-input"
                                                    value={formData.state}
                                                    onChange={e => setFormData({ ...formData, state: e.target.value, city: '' })}
                                                    required
                                                >
                                                    <option value="">Select State</option>
                                                    {State.getStatesOfCountry('IN').map(state => (
                                                        <option key={state.isoCode} value={state.isoCode}>{state.name}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className="form-input"
                                                    value={formData.city}
                                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                                    required
                                                    disabled={!formData.state}
                                                >
                                                    <option value="">Select City</option>
                                                    {formData.state && City.getCitiesOfState('IN', formData.state).map(city => (
                                                        <option key={city.name} value={city.name}>{city.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <input
                                                type="text"
                                                className="form-input"
                                                style={{ marginTop: '10px' }}
                                                value={formData.pincode}
                                                onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                                placeholder="Pincode"
                                                maxLength="6"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label>Street Address</label>
                                            <textarea
                                                className="form-input"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                rows="2"
                                                placeholder="Street, Building, Area..."
                                            />
                                        </div>

                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Phone</label>
                                                <input
                                                    type="tel"
                                                    className="form-input"
                                                    value={formData.phone}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="10-digit number"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Email (for Login) *</label>
                                                <input
                                                    type="email"
                                                    className="form-input"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    required
                                                    placeholder="branch@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label>Confirm Email *</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                value={formData.confirmEmail}
                                                onChange={e => setFormData({ ...formData, confirmEmail: e.target.value })}
                                                required
                                                placeholder="Confirm email address"
                                            />
                                        </div>

                                        <div className="form-actions">
                                            <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                                {saving ? 'Creating...' : 'Create Branch'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default SchoolBranches;
