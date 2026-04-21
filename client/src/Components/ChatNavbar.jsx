import React from 'react';
import '../Styles/ChatNavbar.css';

const ChatNavbar = ({
    otherUserUsername,
    otherUserStatus,
    otherUserProfileImg,
    handleCall,
    handleAudioCall,
    handleDeleteChat,
    handleViewUserDetail,
}) => {
    const firstLetter = otherUserUsername ? otherUserUsername.charAt(0).toUpperCase() : '';
    const isOnline = otherUserStatus === 'online';

    return (
        <div className="chat-navbar">
            <button type="button" className="chat-navbar-user" onClick={handleViewUserDetail}>
                <div className="chat-navbar-avatar">
                    {otherUserProfileImg ? (
                        <img src={otherUserProfileImg} alt="profile" className="chat-navbar-avatar-image" />
                    ) : (
                        <span>{firstLetter}</span>
                    )}
                    {isOnline && <span className="chat-navbar-presence"></span>}
                </div>

                <div className="chat-navbar-copy">
                    <h5>{otherUserUsername}</h5>
                    <small>{isOnline ? 'Online' : otherUserStatus}</small>
                </div>
            </button>

            <div className="chat-navbar-actions">
                <button type="button" className="chat-navbar-action delete" onClick={handleDeleteChat} aria-label="Delete chat">
                    <i className="fas fa-trash-alt"></i>
                </button>
                <button type="button" className="chat-navbar-action" onClick={handleAudioCall} aria-label="Audio call">
                    <i className="fas fa-phone"></i>
                </button>
                <button type="button" className="chat-navbar-action primary" onClick={() => handleCall('video')} aria-label="Video call">
                    <i className="fas fa-video"></i>
                </button>
            </div>
        </div>
    );
};

export default ChatNavbar;
