import React from 'react';
import '../Styles/ModernProfile.css';

const SettingsModal = ({ type, onClose }) => {
    const getContent = () => {
        switch (type) {
            case 'privacy':
                return {
                    title: '🔒 Privacy',
                    body: (
                        <div className="p-3">
                            <div className="mb-4">
                                <h6 className="fw-bold">Last Seen & Online</h6>
                                <p className="text-muted small">Everyone, My contacts, Nobody</p>
                                <div className="form-check form-switch mt-2">
                                    <input className="form-check-input" type="checkbox" defaultChecked />
                                    <label className="form-check-label">Share Last Seen</label>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h6 className="fw-bold">Profile Photo</h6>
                                <p className="text-muted small">Choose who can see your profile picture.</p>
                            </div>
                            <div className="mb-4">
                                <h6 className="fw-bold">Read Receipts</h6>
                                <p className="text-muted small">If turned off, you won't send or receive read receipts.</p>
                                <div className="form-check form-switch mt-2">
                                    <input className="form-check-input" type="checkbox" defaultChecked />
                                    <label className="form-check-label">Read Receipts</label>
                                </div>
                            </div>
                        </div>
                    )
                };
            case 'notifications':
                return {
                    title: '🔔 Notifications',
                    body: (
                        <div className="p-3">
                            <div className="mb-4">
                                <h6 className="fw-bold">Message Notifications</h6>
                                <div className="form-check form-switch mt-2">
                                    <input className="form-check-input" type="checkbox" defaultChecked />
                                    <label className="form-check-label">Conversation Tones</label>
                                </div>
                            </div>
                            <div className="mb-4">
                                <h6 className="fw-bold">Vibration</h6>
                                <select className="form-select mt-2">
                                    <option>Off</option>
                                    <option selected>Default</option>
                                    <option>Short</option>
                                    <option>Long</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <h6 className="fw-bold">High Priority Notifications</h6>
                                <div className="form-check form-switch mt-2">
                                    <input className="form-check-input" type="checkbox" defaultChecked />
                                    <label className="form-check-label">Show previews at top of screen</label>
                                </div>
                            </div>
                        </div>
                    )
                };
            case 'help':
                return {
                    title: '❓ Help',
                    body: (
                        <div className="p-3">
                            <div className="menu-item">
                                <span className="fw-bold">Help Center</span>
                            </div>
                            <div className="menu-item">
                                <span className="fw-bold">Contact us</span>
                            </div>
                            <div className="menu-item">
                                <span className="fw-bold">Terms and Privacy Policy</span>
                            </div>
                            <div className="menu-item">
                                <span className="fw-bold">App info</span>
                            </div>
                        </div>
                    )
                };
            case 'about':
                return {
                    title: 'ℹ️ About',
                    body: (
                        <div className="p-5 text-center">
                            <div className="brand-badge mb-3 mx-auto" style={{width: '60px', height: '60px', borderRadius: '15px', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>
                                <i className="fas fa-comments fa-2x"></i>
                            </div>
                            <h4 className="fw-bold">Chat App</h4>
                            <p className="text-muted">Version 2.4.0 (Stable)</p>
                            <p className="small mt-4">© 2026 Modern Chat Systems</p>
                            <div className="mt-4 pt-4 border-top">
                                <button className="btn btn-sm btn-outline-success">Check for Updates</button>
                            </div>
                        </div>
                    )
                };
            default:
                return { title: 'Settings', body: null };
        }
    };

    const { title, body } = getContent();

    return (
        <div className="modal-overlay">
            <div className="profile-modal shadow">
                <div className="modal-header" style={{background: '#00a884'}}>
                    <h2>{title}</h2>
                    <button 
                        style={{background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '20px'}}
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>
                <div className="modal-body p-0">
                    {body}
                </div>
                <div className="modal-footer">
                    <button className="btn-save" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
