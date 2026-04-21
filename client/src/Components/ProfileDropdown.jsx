import React, { useState, useEffect, useRef } from 'react';
import '../Styles/ModernProfile.css';

const ProfileDropdown = ({ user, onLogout, onAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDropdown = () => setIsOpen(!isOpen);

    const menuItems = [
        { id: 'profile', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>, label: 'My Profile' },
        { id: 'starred', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>, label: 'Starred Messages' },
        { id: 'privacy', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>, label: 'Privacy' },
        { id: 'notifications', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>, label: 'Notifications' },
        { id: 'dark-mode', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>, label: 'Dark Mode' },
        { id: 'help', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>, label: 'Help' },
        { id: 'about', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>, label: 'About' },
    ];

    return (
        <div className="profile-dropdown-container" ref={dropdownRef}>
            <div className="profile-trigger" onClick={toggleDropdown}>
                <div className="profile-avatar-circle">
                    {user.profileImg ? (
                        <img src={user.profileImg} alt="profile" />
                    ) : (
                        <span>{user.username ? user.username.charAt(0).toUpperCase() : '?'}</span>
                    )}
                </div>
            </div>

            {isOpen && (
                <div className="profile-menu">
                    <div className="menu-header">
                        <div className="profile-avatar-circle" style={{width: '45px', height: '45px'}}>
                            {user.profileImg ? <img src={user.profileImg} alt="user" /> : <span>{user.username?.charAt(0).toUpperCase()}</span>}
                        </div>
                        <div className="header-info">
                            <span className="header-name">{user.username}</span>
                            <span className="header-email">{user.email}</span>
                        </div>
                    </div>

                    <div className="menu-list">
                        {menuItems.map((item, index) => (
                            <React.Fragment key={item.id}>
                                <div 
                                    className="menu-item" 
                                    onClick={() => {
                                        onAction(item.id);
                                        setIsOpen(false);
                                    }}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </div>
                                {index === 0 && <div className="menu-divider"></div>}
                                {index === 4 && <div className="menu-divider"></div>}
                            </React.Fragment>
                        ))}
                        <div className="menu-divider"></div>
                        <div className="menu-item logout-item" onClick={() => { onLogout(); setIsOpen(false); }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                            <span>Logout</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileDropdown;