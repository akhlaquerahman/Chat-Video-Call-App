import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../apiConfig';
import '../Styles/ModernProfile.css';

const StarredMessages = ({ onClose, isDarkMode }) => {
    const [starred, setStarred] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStarred = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}api/chat/starred`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setStarred(res.data);
            } catch (err) {
                console.error('Error fetching starred messages:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStarred();
    }, []);

    return (
        <div className="modal-overlay">
            <div className="profile-modal shadow" style={{maxWidth: '550px'}}>
                <div className="modal-header" style={{background: '#00a884'}}>
                    <h2>⭐ Starred Messages</h2>
                    <button 
                        style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px'}}
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>
                <div className="modal-body" style={{maxHeight: '70vh', overflowY: 'auto', padding: '0'}}>
                    {loading ? (
                        <div className="p-4 text-center">Loading starred messages...</div>
                    ) : starred.length === 0 ? (
                        <div className="p-5 text-center">
                            <div style={{fontSize: '48px', color: '#8696a0', marginBottom: '20px'}}>⭐</div>
                            <p style={{color: '#8696a0'}}>No starred messages yet.</p>
                        </div>
                    ) : (
                        <div className="starred-list">
                            {starred.map((msg) => (
                                <div key={msg._id} className="starred-item">
                                    <div className="starred-item-sender">
                                        <div className="profile-avatar-circle" style={{width: '32px', height: '32px', fontSize: '14px'}}>
                                            {msg.senderId?.profileImg ? <img src={msg.senderId.profileImg} alt="sender" /> : msg.senderId?.username?.charAt(0)}
                                        </div>
                                        <span className="ms-2 fw-bold" style={{fontSize: '14px', color: 'var(--wa-text-primary)'}}>
                                            {msg.senderId?.username}
                                        </span>
                                        <small className="ms-auto text-muted">{new Date(msg.createdAt).toLocaleDateString()}</small>
                                    </div>
                                    <div className="starred-item-content">
                                        {msg.text || (msg.filePath && "Media Message")}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

export default StarredMessages;
