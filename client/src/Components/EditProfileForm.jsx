// client/src/Components/EditProfileForm.jsx

import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const EditProfileForm = ({ currentUser, onProfileUpdated, onCancelEdit }) => {
    // State values are correctly initialized from the props
    const [newUsername, setNewUsername] = useState(currentUser.username);
    const [newEmail, setNewEmail] = useState(currentUser.email);
    const [newProfileImg, setNewProfileImg] = useState(undefined); // 💡 State initialized as `undefined` instead of `null`
    
    // State to manage a visual preview of the new image
    const [imagePreview, setImagePreview] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewProfileImg(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            // If the user clears the file input
            setNewProfileImg(null); // Set to `null` to indicate removal
            setImagePreview(null);
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            
            // Append only if values have changed
            if (newUsername !== currentUser.username) {
                formData.append('username', newUsername);
            }
            if (newEmail !== currentUser.email) {
                formData.append('email', newEmail);
            }

            // 💡 Corrected logic for profile picture
            if (newProfileImg) {
                // If a new picture is selected
                formData.append('profileImg', newProfileImg);
            } else if (newProfileImg === null && currentUser.profileImg) {
                // Only send 'remove' flag if the user explicitly cleared the input
                formData.append('removeProfilePic', 'true');
            }
            
            // If no changes are made, we can exit early.
            if (formData.get('username') === null && formData.get('email') === null && newProfileImg === undefined) {
                 alert('No changes were made.');
                 onCancelEdit();
                 return;
            }

            const token = localStorage.getItem('token');

            const res = await axios.put(`${API_URL}api/users/${currentUser.id}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-auth-token': token
                },
            });
            
            // 💡 NEW: Update the localStorage with the new token
            if (res.data.token) {
                localStorage.setItem('token', res.data.token);
            }
            
            // Update the state with the response data
            // 💡 We'll now pass the `res.data.user` object which contains updated user details.
            onProfileUpdated(res.data.user);
            
            alert('Profile updated successfully!');
            onCancelEdit();
        } catch (err) {
            console.error('Error updating user:', err.response?.data);
            alert('Failed to update profile.');
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="text-center mb-4">Edit Profile</h2>
            <form onSubmit={handleSaveEdit}>
                {/* 💡 Display current or new profile picture */}
                <div className="text-center mb-3">
                    {imagePreview ? (
                        <img 
                            src={imagePreview} 
                            alt="New Profile" 
                            style={{ 
                                width: '100px', 
                                height: '100px', 
                                borderRadius: '50%',
                                objectFit: 'cover'
                            }} 
                        />
                    ) : currentUser.profileImg ? (
                        <img 
                            src={currentUser.profileImg}
                            alt="Current Profile" 
                            style={{ 
                                width: '100px', 
                                height: '100px', 
                                borderRadius: '50%',
                                objectFit: 'cover'
                            }} 
                        />
                    ) : (
                        <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#ccc', display: 'inline-block' }}></div>
                    )}
                    <p className="mt-2 text-muted">Current Profile Picture</p>
                </div>
                
                <div className="mb-3">
                    <label className="form-label">Username</label>
                    <input
                        type="text"
                        className="form-control"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                        type="email"
                        className="form-control"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-3">
                    <label className="form-label">Update Profile Picture</label>
                    <input
                        type="file"
                        className="form-control"
                        onChange={handleFileChange}
                        accept="image/*"
                    />
                </div>
                <div className="d-flex justify-content-end">
                    <button type="button" className="btn btn-secondary me-2" onClick={onCancelEdit}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditProfileForm;