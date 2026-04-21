import React, { useState } from 'react';
import axios from 'axios';
import API_URL from '../apiConfig';
import '../Styles/ModernProfile.css';

const EditProfileForm = ({ currentUser, onProfileUpdated, onCancelEdit }) => {
    const [formData, setFormData] = useState({
        username: currentUser.username || '',
        email: currentUser.email || '',
        phoneNumber: currentUser.phoneNumber || '',
        about: currentUser.about || "Hey there! I'm using WhatsApp.",
    });
    const [newProfileImg, setNewProfileImg] = useState(undefined);
    const [imagePreview, setImagePreview] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('general'); // 'general' or 'security'
    
    // Password change states
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const handlePasswordChange = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            alert('Please fill all password fields');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            alert('New passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}api/users/change-password`, 
                { currentPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err) {
            console.error('Password change error:', err.response?.data);
            alert(err.response?.data?.msg || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewProfileImg(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePic = () => {
        setNewProfileImg(null); // Indicates removal
        setImagePreview('removed'); // Special state for UI
    };

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append('username', formData.username);
            data.append('email', formData.email);
            data.append('phoneNumber', formData.phoneNumber);
            data.append('about', formData.about);
            
            if (newProfileImg) {
                data.append('profileImg', newProfileImg);
            } else if (newProfileImg === null) {
                data.append('removeProfilePic', 'true');
            }

            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}api/users/${currentUser.id}`, data, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                },
            });
            
            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
            }
            
            onProfileUpdated(res.data.user, res.data.token);
            alert('Profile updated successfully!');
            onCancelEdit();
        } catch (err) {
            console.error('Error updating user:', err.response?.data);
            alert(err.response?.data?.msg || 'Failed to update profile.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="profile-modal shadow-lg">
                <div className="modal-header">
                    <div className="d-flex align-items-center">
                        <i className="fas fa-user-edit me-3"></i>
                        <h2 className="mb-0">Profile Settings</h2>
                    </div>
                    <button className="modal-close-icon" onClick={onCancelEdit}>✕</button>
                </div>

                <div className="modal-tabs">
                    <button 
                        className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General Info
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                        onClick={() => setActiveTab('security')}
                    >
                        Security
                    </button>
                </div>

                <div className="modal-scroll-body">
                    {activeTab === 'general' ? (
                        <form id="profile-form" onSubmit={handleSaveEdit} className="p-4">
                            <div className="text-center mb-4">
                                <div className="avatar-edit-wrapper">
                                    <div className="profile-avatar-circle large-avatar">
                                        {imagePreview === 'removed' ? (
                                            <span>{formData.username?.charAt(0).toUpperCase()}</span>
                                        ) : imagePreview ? (
                                            <img src={imagePreview} alt="Preview" />
                                        ) : currentUser.profileImg ? (
                                            <img src={currentUser.profileImg} alt="Current" />
                                        ) : (
                                            <span>{formData.username?.charAt(0).toUpperCase()}</span>
                                        )}
                                    </div>
                                    <label htmlFor="modal-upload" className="camera-icon-badge">
                                        <i className="fas fa-camera"></i>
                                    </label>
                                    <input id="modal-upload" type="file" hidden onChange={handleFileChange} accept="image/*" />
                                </div>
                                <div className="mt-2">
                                    <button type="button" className="text-danger border-0 bg-transparent small" onClick={handleRemovePic}>
                                        Remove Photo
                                    </button>
                                </div>
                            </div>

                            <div className="form-group mb-3">
                                <label className="form-label text-wa-green">Username</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    name="username"
                                    value={formData.username}
                                    onChange={onChange}
                                    required
                                />
                            </div>

                            <div className="form-group mb-3">
                                <label className="form-label text-wa-green">About</label>
                                <textarea
                                    className="form-input"
                                    name="about"
                                    rows="2"
                                    value={formData.about}
                                    onChange={onChange}
                                    style={{resize: 'none'}}
                                ></textarea>
                                <small className="text-muted">Visible to your contacts.</small>
                            </div>

                            <div className="form-group mb-3">
                                <label className="form-label text-wa-green">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    name="email"
                                    value={formData.email}
                                    onChange={onChange}
                                    disabled
                                    title="Email cannot be changed"
                                />
                            </div>
                            
                            <div className="form-group mb-4">
                                <label className="form-label text-wa-green">Phone Number</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={onChange}
                                />
                            </div>
                        </form>
                    ) : (
                        <div className="p-4 security-section">
                            <div className="security-header mb-4">
                                <h3>Account Security</h3>
                                <p className="text-muted small">Manage your password to keep your account secure.</p>
                            </div>

                            <div className="form-group mb-3">
                                <label className="form-label">Current Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Verify current password"
                                />
                            </div>
                            <div className="form-group mb-3">
                                <label className="form-label">New Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="At least 6 characters"
                                />
                            </div>
                            <div className="form-group mb-4">
                                <label className="form-label">Confirm New Password</label>
                                <input
                                    type="password"
                                    className="form-input"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    placeholder="Repeat new password"
                                />
                            </div>
                            <button 
                                type="button" 
                                className="btn-save w-100" 
                                onClick={handlePasswordChange}
                                disabled={loading}
                            >
                                {loading ? "Updating..." : "Update Password"}
                            </button>
                        </div>
                    )}
                </div>

                <div className="modal-footer px-4 py-3">
                    <button type="button" className="btn-cancel" onClick={onCancelEdit}>Cancel</button>
                    {activeTab === 'general' && (
                        <button type="submit" form="profile-form" className="btn-save" disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditProfileForm;
