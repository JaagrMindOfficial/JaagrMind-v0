
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBuilding, faEnvelope, faShieldHalved, faKey, faSave, faPen, faEye, faEyeSlash, faPhone, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import { Country, State, City } from 'country-state-city';
import Layout from '../components/common/Layout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Settings.css';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Password State
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: ''
    });
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

    // Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
    const [profile, setProfile] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: ''
    });

    useEffect(() => {
        if (user) {
            setProfile({
                name: user.name || '',
                email: user.email || '',
                phone: user.phone || user.contact?.phone || '',
                address: user.address?.street || (typeof user.address === 'string' ? user.address : '') || '',
                city: user.address?.city || '',
                state: user.address?.state || '',
                pincode: user.address?.pincode || ''
            });
        }
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
            const endpoint = user.role === 'admin'
                ? '/api/admin/profile'
                : '/api/school/profile';

            const payload = user.role === 'admin'
                ? { name: profile.name, email: profile.email }
                : {
                    name: profile.name,
                    email: profile.email,
                    phone: profile.phone,
                    address: {
                        street: profile.address,
                        city: profile.city,
                        state: profile.state,
                        pincode: profile.pincode
                    }
                };

            const response = await api.put(endpoint, payload);

            // Update user context if available
            if (updateUser) {
                // For school, the response structure might be nested in `school` object or flat
                // Adjust based on the actual API response from previous step
                const updatedData = response.data.school || response.data;

                updateUser({
                    ...user,
                    name: updatedData.name,
                    email: updatedData.email,
                    phone: updatedData.contact?.phone || updatedData.phone,
                    address: updatedData.address
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
            email: user?.email || '',
            phone: user?.phone || user?.contact?.phone || '',
            address: user?.address?.street || (typeof user?.address === 'string' ? user?.address : '') || '',
            city: user?.address?.city || '',
            state: user?.address?.state || '',
            pincode: user?.address?.pincode || ''
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
                            {!isEditingProfile && (
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
                        <div className={`profile - message message - alert ${profileMessage.type} `}>
                            {profileMessage.text}
                        </div>
                    )}

                    {isEditingProfile ? (
                        <form onSubmit={handleProfileSubmit} className="profile-edit-form">
                            <div className="form-group">
                                <label>Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={profile.name}
                                    onChange={handleProfileChange}
                                    className="form-input"
                                    placeholder="Enter name"
                                    required
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
                                    placeholder="Enter email"
                                />
                            </div>

                            {user?.role === 'school' && (
                                <>
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={profile.phone}
                                            onChange={handleProfileChange}
                                            className="form-input"
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>State & City</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <select
                                                name="state"
                                                value={profile.state}
                                                onChange={(e) => {
                                                    handleProfileChange(e);
                                                    setProfile(prev => ({ ...prev, city: '' }));
                                                }}
                                                className="form-input"
                                            >
                                                <option value="">Select State</option>
                                                {State.getStatesOfCountry('IN').map((state) => (
                                                    <option key={state.isoCode} value={state.isoCode}>{state.name}</option>
                                                ))}
                                            </select>
                                            <select
                                                name="city"
                                                value={profile.city}
                                                onChange={handleProfileChange}
                                                className="form-input"
                                                disabled={!profile.state}
                                            >
                                                <option value="">Select City</option>
                                                {profile.state && City.getCitiesOfState('IN', profile.state).map((city) => (
                                                    <option key={city.name} value={city.name}>{city.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Pincode</label>
                                        <input
                                            type="text"
                                            name="pincode"
                                            value={profile.pincode}
                                            onChange={handleProfileChange}
                                            className="form-input"
                                            placeholder="Pincode"
                                            maxLength="6"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Street Address</label>
                                        <textarea
                                            name="address"
                                            value={profile.address}
                                            onChange={handleProfileChange}
                                            className="form-input"
                                            placeholder="Street, Building, Area..."
                                            rows="2"
                                        />
                                    </div>
                                </>
                            )}

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

                            {user?.role === 'school' && (
                                <>
                                    <div className="profile-item">
                                        <span className="profile-label">
                                            <FontAwesomeIcon icon={faShieldHalved} /> School Type
                                        </span>
                                        <span className="profile-value badge">
                                            {user?.type === 'sub' ? 'Branch School' : 'Super School'}
                                        </span>
                                    </div>

                                    {user?.type === 'sub' && user?.parentId && (
                                        <div className="profile-item">
                                            <span className="profile-label">
                                                <FontAwesomeIcon icon={faBuilding} /> Main Campus
                                            </span>
                                            <span className="profile-value">
                                                {user.parentId.name} ({user.parentId.schoolId})
                                            </span>
                                        </div>
                                    )}

                                    {/* Phone Display */}
                                    {(user?.phone || user?.contact?.phone) && (
                                        <div className="profile-item">
                                            <span className="profile-label">
                                                <FontAwesomeIcon icon={faPhone} /> Phone
                                            </span>
                                            <span className="profile-value">
                                                {user?.phone || user?.contact?.phone}
                                            </span>
                                        </div>
                                    )}

                                    {user?.address && (
                                        <div className="profile-item">
                                            <span className="profile-label">
                                                <FontAwesomeIcon icon={faMapMarkerAlt} /> Address
                                            </span>
                                            <span className="profile-value">
                                                {typeof user.address === 'string' ? (
                                                    user.address
                                                ) : (
                                                    <>
                                                        {user.address.street && <div>{user.address.street}</div>}
                                                        <div>
                                                            {user.address.city && <span>{user.address.city}{user.address.state ? ', ' : ''}</span>}
                                                            {user.address.state && <span>{user.address.state}</span>}
                                                            {user.address.pincode && <span> - {user.address.pincode}</span>}
                                                        </div>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}

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
                            <div className={`message - alert ${message.type} `}>
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
