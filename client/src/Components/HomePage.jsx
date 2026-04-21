import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import ChatList from './ChatList';
import ChatArea from './ChatArea';
import CallNotification from './CallNotification';
import ProfileDropdown from './ProfileDropdown'; 
import EditProfileForm from './EditProfileForm';
import StarredMessages from './StarredMessages';
import SettingsModal from './SettingsModal';
import API_URL from '../apiConfig';
import '../Styles/HomePage.css';
import 'bootstrap/dist/css/bootstrap.min.css';

const HomePage = ({ token, setToken, socket, setCurrentUser, isDarkMode, toggleDarkMode, unreadCounts, setUnreadCounts, lastMessageTimes, setLastMessageTimes }) => {
    const [incomingCall, setIncomingCall] = useState(null);
    const [localUser, setLocalUser] = useState(null); 
    const [activeModal, setActiveModal] = useState(null); // 'profile', 'starred', 'privacy', 'notifications', 'help', 'about'
    
    // Search functionality
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    // Selected user in chat
    const [selectedUser, setSelectedUser] = useState(null);

    // Room functionality
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [callType, setCallType] = useState('video');

    const navigate = useNavigate();

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken('');
        setCurrentUser(null); 
        setLocalUser(null);
        setIncomingCall(null);
        setUnreadCounts({});
        navigate('/');
    }, [setToken, navigate, setCurrentUser, setUnreadCounts]);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common.Authorization = `Bearer ${token}`;
            try {
                const decoded = jwtDecode(token);
                const currentTime = Date.now() / 1000;
                if (decoded.exp < currentTime) {
                    logout();
                } else {
                    setLocalUser(decoded.user);
                    setCurrentUser(decoded.user); 
                }
            } catch (error) {
                console.error('Failed to decode token:', error);
                logout(); 
            }
        } else {
            delete axios.defaults.headers.common.Authorization;
        }
        
        socket.on('incoming_call', ({ roomName, callerIdentity, callType }) => {
            setIncomingCall({ roomName, callerIdentity, callType });
        });

        return () => {
            socket.off('incoming_call');
        };
    }, [token, socket, logout, setCurrentUser]);

    useEffect(() => {
        if (!socket || !localUser?.id) return;
        // The unreadCounts logic is now handled in App.jsx globally
    }, [socket, localUser, selectedUser]);

    const handleAnswerCall = () => {
        if (incomingCall) {
            const type = incomingCall.callType || 'video';
            navigate(`/call/${incomingCall.roomName}/${localUser.username}?type=${type}`);
            setIncomingCall(null);
        }
    };

    const handleDropdownAction = (id) => {
        if (id === 'dark-mode') {
            toggleDarkMode();
        } else {
            setActiveModal(id);
        }
    };

    const handleProfileUpdated = (updatedUser, newToken) => {
        if (newToken) {
            setToken(newToken);
        }
        setLocalUser(updatedUser);
        setCurrentUser(updatedUser); 
        setActiveModal(null);
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        if (!user?._id) return;
        setUnreadCounts((prev) => {
            if (!prev[user._id]) return prev;
            const next = { ...prev };
            delete next[user._id];
            return next;
        });
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }
        try {
            const res = await axios.get(`${API_URL}api/users/search?query=${searchQuery}`);
            setSearchResults(res.data);
        } catch (err) {
            console.error('Error searching for users:', err);
            setSearchResults([]);
        }
    };

    const toggleSearch = () => {
        setIsSearching(!isSearching);
        if (isSearching) {
            setSearchQuery('');
            setSearchResults([]);
        }
    };
    
    const handleCreateRoom = () => {
        if (!roomName.trim()) {
            alert('Please enter a room name.');
            return;
        }
        navigate(`/call/${roomName}/${localUser.username}?type=${callType}`);
    };

    const handleJoinRoom = () => {
        if (!roomName.trim()) {
            alert('Please enter a room name to join.');
            return;
        }
        navigate(`/call/${roomName}/${localUser.username}?type=${callType}`);
    };
    
    const generateUniqueRoomName = () => {
        const uniqueId = Math.random().toString(36).substring(2, 8);
        setRoomName(`Room-${uniqueId}`);
    };

    return (
        <div className="App">
            <header className="App-header">
                <div className="homepage-header">
                    <div className="homepage-brand">
                        <div className="brand-badge">
                            <i className="fas fa-comments"></i>
                        </div>
                        <div className="brand-copy">
                            <h2>My Chat App</h2>
                            <p>{localUser ? `Signed in as ${localUser.username}` : 'Secure chat, calls and media sharing'}</p>
                        </div>
                    </div>

                    <div className="homepage-actions">
                        <button className={`header-action-btn ${isSearching ? 'active' : ''}`} type="button" onClick={toggleSearch}>
                            <i className="fas fa-search"></i>
                            <span>Search</span>
                        </button>

                        <button className="header-action-btn join-room-btn" type="button" onClick={() => setShowRoomModal(true)}>
                            <i className="fas fa-video"></i>
                            <span>Join Room</span>
                        </button>

                        {localUser && (
                            <ProfileDropdown 
                                user={localUser} 
                                onLogout={logout} 
                                onAction={handleDropdownAction}
                            />
                        )}
                    </div>
                </div>

                {isSearching && (
                    <div className="homepage-search-panel">
                        <div className="homepage-search-input">
                            <i className="fas fa-search"></i>
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyUp={handleSearch}
                            />
                        </div>
                    </div>
                )}

                <CallNotification incomingCall={incomingCall} handleAnswerCall={handleAnswerCall} />
            </header>
            
            <div className="chat-layout">
                <div className={`chat-sidebar ${selectedUser ? 'mobile-hidden' : ''}`}>
                    <ChatList 
                        socket={socket} 
                        searchResults={searchResults} 
                        isSearching={isSearching} 
                        onUserSelect={handleSelectUser}
                        selectedUser={selectedUser}
                        unreadCounts={unreadCounts}
                        lastMessageTimes={lastMessageTimes}
                    />
                </div>
                <div className={`chat-main ${selectedUser ? 'mobile-active' : 'mobile-hidden'}`}>
                    <ChatArea 
                        socket={socket} 
                        selectedUser={selectedUser} 
                        currentUser={localUser} 
                        onBackToList={() => setSelectedUser(null)}
                        isDarkMode={isDarkMode}
                        setLastMessageTimes={setLastMessageTimes}
                    />
                </div>
            </div>

            {/* Modals */}
            {activeModal === 'profile' && (
                <EditProfileForm 
                    currentUser={localUser}
                    onProfileUpdated={handleProfileUpdated}
                    onCancelEdit={() => setActiveModal(null)}
                />
            )}
            {activeModal === 'starred' && (
                <StarredMessages 
                    isDarkMode={isDarkMode}
                    onClose={() => setActiveModal(null)}
                />
            )}
            {['privacy', 'notifications', 'help', 'about'].includes(activeModal) && (
                <SettingsModal 
                    type={activeModal}
                    onClose={() => setActiveModal(null)}
                />
            )}
            
            {showRoomModal && (
                <div className="modal show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Create or Join a Room</h5>
                                <button type="button" className="btn-close" onClick={() => setShowRoomModal(false)} aria-label="Close"></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label htmlFor="roomName" className="form-label">Room Name</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        id="roomName" 
                                        placeholder="Enter or create a room name" 
                                        value={roomName}
                                        onChange={(e) => setRoomName(e.target.value)}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label htmlFor="callType" className="form-label">Call Type</label>
                                    <select 
                                        className="form-select" 
                                        id="callType" 
                                        value={callType}
                                        onChange={(e) => setCallType(e.target.value)}
                                    >
                                        <option value="video">Video Call</option>
                                        <option value="audio">Audio Call</option>
                                    </select>
                                </div>
                                <button className="btn btn-secondary mt-2 w-100" onClick={generateUniqueRoomName}>
                                    Generate Unique Room Name
                                </button>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-primary" onClick={handleCreateRoom}>Create Room</button>
                                <button type="button" className="btn btn-success" onClick={handleJoinRoom}>Join Room</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;
