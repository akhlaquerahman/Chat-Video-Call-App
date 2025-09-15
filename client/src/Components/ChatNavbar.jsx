import React from 'react';
import '../Styles/ChatNavbar.css'; 

// 💡 NEW: Accept handleViewUserDetail as a prop
const ChatNavbar = ({ otherUserUsername, otherUserStatus, otherUserProfileImg, handleCall, handleAudioCall, handleDeleteChat, handleViewUserDetail }) => {
    const firstLetter = otherUserUsername ? otherUserUsername.charAt(0).toUpperCase() : '';

    return (
        <div className="chat-navbar d-flex align-items-center justify-content-between py-3 px-3 border-bottom bg-light">
            <div className="d-flex align-items-center" onClick={handleViewUserDetail}> {/* 💡 Added onClick here */}
                <div className="profile-icon d-flex align-items-center justify-content-center me-2">
                    {otherUserProfileImg ? (
                        <img 
                            src={otherUserProfileImg}
                            alt="profile" 
                            className="profile-img" 
                        />
                    ) : (
                        firstLetter
                    )}
                </div>
                <div className="d-flex flex-column">
                    <h5 className="mb-0">{otherUserUsername}</h5>
                    <small className="status-text text-muted">
                        {otherUserStatus === 'online' && <span className="online-dot me-1"></span>}
                        {otherUserStatus}
                    </small>
                </div>
            </div>
            <div className="d-flex">
                <button onClick={handleDeleteChat} className="btn btn-danger me-2">
                    <i className="fas fa-trash-alt"></i>
                </button>
                <button onClick={() => handleAudioCall()} className="btn btn-info text-white me-2">
                    <i className="fas fa-phone"></i>
                </button>
                <button onClick={() => handleCall('video')} className="btn btn-primary">
                    <i className="fas fa-video me-2"></i>
                </button>
            </div>
        </div>
    );
};

export default ChatNavbar;