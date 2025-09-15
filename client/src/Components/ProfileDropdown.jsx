// client/src/Components/ProfileDropdown.jsx

import React from 'react';
import { Dropdown } from 'react-bootstrap';
import '../Styles/ProfileDropdown.css';

const ProfileDropdown = ({ user, onLogout, onDeleteAccount, onEditProfile }) => {

    const handleEditProfileClick = () => {
        onEditProfile();
    };

    return (
        <Dropdown align="end">
            <Dropdown.Toggle as="div" id="profile-dropdown-toggle">
                {/* 💡 This is the correct structure for a better UI */}
                <div className="d-flex flex-column align-items-center justify-content-center">
                    <div className="profile-icon">
                        {user.profileImg ? (
                            <img src={user.profileImg} alt="profile" className="profile-img" />
                        ) : (
                            user.username ? user.username.charAt(0).toUpperCase() : ''
                        )}
                    </div>
                    {/* 💡 This will display the username below the profile pic on the main header */}
                    <span className="profile-username mt-1">{user.username}</span>
                </div>
            </Dropdown.Toggle>

            <Dropdown.Menu>
                {/* 💡 The new dropdown header with large icon and user details */}
                <div className="dropdown-header d-flex flex-column align-items-center p-3">
                    <div className="profile-icon-large mb-2">
                        {user.profileImg ? (
                            <img src={user.profileImg} alt="profile" className="profile-img-large" />
                        ) : (
                            user.username ? user.username.charAt(0).toUpperCase() : ''
                        )}
                    </div>
                    <span className="profile-username-large fw-bold">{user.username}</span>
                    <small className="text-muted">{user.email}</small>
                </div>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleEditProfileClick}>Edit Profile</Dropdown.Item>
                <Dropdown.Item onClick={onDeleteAccount}>Delete Account</Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={onLogout}>Logout</Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default ProfileDropdown;