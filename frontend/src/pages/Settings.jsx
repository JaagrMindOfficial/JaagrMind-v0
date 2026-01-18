import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBuilding, faEnvelope, faShieldHalved, faKey, faSave, faPen, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import Layout from '../components/common/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Settings.css';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profile, setProfile] = useState({
        name: user?.name || '',
        email: user?.email || ''
    });
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

    useEffect(() => {
        setProfile({
            name: user?.name || '',
            email: user?.email || ''
        });
    }, [user]);

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const handleProfileChange = (e) => {
        setProfile({ ...profile, [e.target.name]: e.target.value });
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setLoading(true);
        try {
            // Determine endpoint based on role
            const endpoint = user.role === 'admin'
                ? '/api/admin/change-password'
                : '/api/school/change-password';

            await api.put(endpoint, {
                currentPassword: passwords.current,
                newPassword: passwords.new
            });

            setMessage({ type: 'success', text: 'Password updated successfully' });
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Error updating password'
            });
        } finally {
            setLoading(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        }
    };

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            const response = await api.put('/api/admin/profile', {
                name: profile.name,
                email: profile.email
            });

            // Update user context if available
            if (updateUser) {
                updateUser({
                    ...user,
                    name: response.data.name,
                    email: response.data.email
                });
            }

            setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
            setIsEditingProfile(false);
        } catch (error) {
            setProfileMessage({
                type: 'error',
                text: error.response?.data?.message || 'Error updating profile'
            });
        } finally {
            setProfileLoading(false);
            setTimeout(() => setProfileMessage({ type: '', text: '' }), 3000);
        }
    };

    const cancelProfileEdit = () => {
        setProfile({
            name: user?.name || '',
            email: user?.email || ''
        });
        setIsEditingProfile(false);
        setProfileMessage({ type: '', text: '' });
    };

    return (
        <Layout title="Settings" subtitle="Manage your profile and security">
            <div className="settings-container">
                {/* Profile Card */}
                <motion.div
                    className="settings-card profile-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="card-header">
                        <h2>
                            <FontAwesomeIcon icon={faUser} /> Profile Information
                            {user?.role === 'admin' && !isEditingProfile && (
                                <button
                                    className="btn btn-ghost btn-sm edit-profile-btn"
                                    onClick={() => setIsEditingProfile(true)}
                                    title="Edit Profile"
                                >
                                    <FontAwesomeIcon icon={faPen} />
                                </button>
                            )}
                        </h2>
                    </div>

                    {profileMessage.text && (
                        <div className={`profile-message message-alert ${profileMessage.type}`}>
                            {profileMessage.text}
                        </div>
                    )}

                    {isEditingProfile && user?.role === 'admin' ? (
                        <form onSubmit={handleProfileSubmit} className="profile-edit-form">
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={profile.name}
                                    onChange={handleProfileChange}
                                    className="form-input"
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={profile.email}
                                    onChange={handleProfileChange}
                                    required
                                    className="form-input"
                                    placeholder="Enter your email"
                                />
                            </div>
                            <div className="form-actions profile-actions">
                                <button
                                    type="button"
                                    className="btn btn-ghost"
                                    onClick={cancelProfileEdit}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={profileLoading}
                                >
                                    {profileLoading ? 'Saving...' : <>
                                        <FontAwesomeIcon icon={faSave} /> Save Changes
                                    </>}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="profile-details">
                            <div className="profile-item">
                                <span className="profile-label">
                                    <FontAwesomeIcon icon={user?.role === 'school' ? faBuilding : faUser} />
                                    {user?.role === 'school' ? ' School Name' : ' Name'}
                                </span>
                                <span className="profile-value">{user?.name || user?.schoolId}</span>
                            </div>

                            <div className="profile-item">
                                <span className="profile-label">
                                    <FontAwesomeIcon icon={faEnvelope} /> Email / ID
                                </span>
                                <span className="profile-value">{user?.email || user?.schoolId}</span>
                            </div>

                            <div className="profile-item">
                                <span className="profile-label">
                                    <FontAwesomeIcon icon={faShieldHalved} /> Role
                                </span>
                                <span className="profile-value badge">{user?.role?.toUpperCase()}</span>
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Password Card */}
                <motion.div
                    className="settings-card password-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="card-header">
                        <h2><FontAwesomeIcon icon={faKey} /> Change Password</h2>
                    </div>

                    <form onSubmit={handlePasswordSubmit} className="password-form">
                        <div className="form-group">
                            <label>Current Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.current ? "text" : "password"}
                                    name="current"
                                    value={passwords.current}
                                    onChange={handlePasswordChange}
                                    required
                                    className="form-input"
                                    placeholder="Enter current password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                    title={showPasswords.current ? "Hide password" : "Show password"}
                                >
                                    <FontAwesomeIcon icon={showPasswords.current ? faEyeSlash : faEye} />
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>New Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.new ? "text" : "password"}
                                    name="new"
                                    value={passwords.new}
                                    onChange={handlePasswordChange}
                                    required
                                    className="form-input"
                                    placeholder="Enter new password"
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                    title={showPasswords.new ? "Hide password" : "Show password"}
                                >
                                    <FontAwesomeIcon icon={showPasswords.new ? faEyeSlash : faEye} />
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Confirm New Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.confirm ? "text" : "password"}
                                    name="confirm"
                                    value={passwords.confirm}
                                    onChange={handlePasswordChange}
                                    required
                                    className="form-input"
                                    placeholder="Confirm new password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                    title={showPasswords.confirm ? "Hide password" : "Show password"}
                                >
                                    <FontAwesomeIcon icon={showPasswords.confirm ? faEyeSlash : faEye} />
                                </button>
                            </div>
                        </div>

                        {message.text && (
                            <div className={`message-alert ${message.type}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Updating...' : <>
                                    <FontAwesomeIcon icon={faSave} /> Update Password
                                </>}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </Layout>
    );
};

export default Settings;
