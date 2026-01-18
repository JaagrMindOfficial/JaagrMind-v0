import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserShield,
    faPenToSquare,
    faTrash,
    faPlus,
    faSearch,
    faEnvelope,
    faKey,
    faCrown,
    faEye,
    faEyeSlash
} from '@fortawesome/free-solid-svg-icons';
import Layout from '../../components/common/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AdminManagement.css';

const AdminManagement = () => {
    const { user } = useAuth();
    const [admins, setAdmins] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [deletingAdmin, setDeletingAdmin] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'admin'
    });

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            const response = await api.get('/api/admin/admins');
            // Handle both paginated { data, pagination } and legacy array responses
            setAdmins(response.data.data || response.data);
        } catch (error) {
            console.error('Error fetching admins:', error);
            setMessage({ type: 'error', text: 'Failed to load admin accounts' });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            if (editingAdmin) {
                const updateData = {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role
                };
                if (formData.password) {
                    updateData.password = formData.password;
                }
                await api.put(`/api/admin/admins/${editingAdmin._id}`, updateData);
                setMessage({ type: 'success', text: 'Admin updated successfully' });
            } else {
                await api.post('/api/admin/admins', formData);
                setMessage({ type: 'success', text: 'Admin created successfully' });
            }
            fetchAdmins();
            closeModal();
        } catch (error) {
            console.error('Error saving admin:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Error saving admin'
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingAdmin) return;
        setSaving(true);
        try {
            await api.delete(`/api/admin/admins/${deletingAdmin._id}`);
            setMessage({ type: 'success', text: 'Admin deleted successfully' });
            fetchAdmins();
            closeDeleteModal();
        } catch (error) {
            console.error('Error deleting admin:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Error deleting admin'
            });
        } finally {
            setSaving(false);
        }
    };

    const openModal = (admin = null) => {
        if (admin) {
            setEditingAdmin(admin);
            setFormData({
                name: admin.name || '',
                email: admin.email || '',
                password: '',
                role: admin.role || 'admin'
            });
        } else {
            setEditingAdmin(null);
            setFormData({
                name: '',
                email: '',
                password: '',
                role: 'admin'
            });
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingAdmin(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            role: 'admin'
        });
    };

    const openDeleteModal = (admin) => {
        setDeletingAdmin(admin);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setDeletingAdmin(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const filteredAdmins = admins.filter(admin =>
        admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <Layout title="Admin Management">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading admins...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout title="Admin Management" subtitle="Manage administrator accounts">
            {message.text && (
                <motion.div
                    className={`page-message message-alert ${message.type}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {message.text}
                </motion.div>
            )}

            <div className="page-header">
                <div className="search-bar">
                    <FontAwesomeIcon icon={faSearch} className="search-icon" />
                    <input
                        type="text"
                        className="form-input search-input"
                        placeholder="Search admins by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="header-info">
                    <span className="text-muted">{filteredAdmins.length} admin(s)</span>
                </div>
                <motion.button
                    className="btn btn-primary"
                    onClick={() => openModal()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <FontAwesomeIcon icon={faPlus} /> Add Admin
                </motion.button>
            </div>

            {/* Admins Table */}
            <div className="admins-table-container card">
                <table className="admins-table">
                    <thead>
                        <tr>
                            <th>Admin</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAdmins.map((admin, index) => (
                            <motion.tr
                                key={admin._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={admin._id === user?._id ? 'current-user-row' : ''}
                            >
                                <td>
                                    <div className="admin-info">
                                        <div className="admin-avatar">
                                            {admin.name?.[0]?.toUpperCase() || 'A'}
                                        </div>
                                        <div className="admin-name">
                                            {admin.name || 'Unnamed'}
                                            {admin._id === user?._id && (
                                                <span className="you-badge">You</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <div className="admin-email">
                                        <FontAwesomeIcon icon={faEnvelope} className="email-icon" />
                                        {admin.email}
                                    </div>
                                </td>
                                <td>
                                    <span className={`role-badge ${admin.role}`}>
                                        {admin.role === 'superadmin' && <FontAwesomeIcon icon={faCrown} />}
                                        {admin.role?.toUpperCase()}
                                    </span>
                                </td>
                                <td className="date-cell">{formatDate(admin.createdAt)}</td>
                                <td className="date-cell">{formatDate(admin.lastLogin)}</td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="action-btn edit"
                                            onClick={() => openModal(admin)}
                                            title="Edit Admin"
                                        >
                                            <FontAwesomeIcon icon={faPenToSquare} />
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => openDeleteModal(admin)}
                                            title="Delete Admin"
                                            disabled={admin._id === user?._id}
                                        >
                                            <FontAwesomeIcon icon={faTrash} />
                                        </button>
                                    </div>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>

                {filteredAdmins.length === 0 && admins.length > 0 && (
                    <div className="empty-state">
                        <FontAwesomeIcon icon={faSearch} className="empty-icon" />
                        <p>No admins match "{searchQuery}"</p>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSearchQuery('')}>
                            Clear Search
                        </button>
                    </div>
                )}

                {admins.length === 0 && (
                    <div className="empty-state">
                        <FontAwesomeIcon icon={faUserShield} className="empty-icon" />
                        <p>No admin accounts found</p>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
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
                                    {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
                                </h2>
                                <button className="modal-close" onClick={closeModal}>×</button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Admin name"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Email *</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="admin@example.com"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">
                                            <FontAwesomeIcon icon={faKey} /> Password {editingAdmin ? '(leave empty to keep current)' : '*'}
                                        </label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-input"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder={editingAdmin ? '••••••••' : 'Enter password'}
                                                required={!editingAdmin}
                                                minLength={6}
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => setShowPassword(!showPassword)}
                                                title={showPassword ? "Hide password" : "Show password"}
                                            >
                                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Role</label>
                                        <select
                                            className="form-input"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="superadmin">Super Admin</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button type="button" className="btn btn-outline" onClick={closeModal}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>
                                        {saving ? 'Saving...' : editingAdmin ? 'Update Admin' : 'Create Admin'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteModal && deletingAdmin && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeDeleteModal}
                    >
                        <motion.div
                            className="modal modal-confirm"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2 className="modal-title">Delete Admin?</h2>
                                <button className="modal-close" onClick={closeDeleteModal}>×</button>
                            </div>

                            <div className="modal-body">
                                <div className="confirm-message">
                                    <FontAwesomeIcon icon={faTrash} className="confirm-icon danger" />
                                    <p>
                                        Are you sure you want to delete <strong>{deletingAdmin.name || deletingAdmin.email}</strong>?
                                    </p>
                                    <p className="text-muted">This action cannot be undone.</p>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={closeDeleteModal}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleDelete}
                                    disabled={saving}
                                >
                                    {saving ? 'Deleting...' : 'Delete Admin'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    );
};

export default AdminManagement;
