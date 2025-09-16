import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import '../Styles/UserList.css'; 

const API_URL = process.env.REACT_APP_API_URL;

const UserList = ({ socket, searchResults, isSearching }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    // 💡 NEW: State to store the list of online users
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    // 💡 NEW: State to store last seen status
    const [lastSeenStatuses, setLastSeenStatuses] = useState({});
    
    const navigate = useNavigate();

    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                const decoded = jwtDecode(token);
                socket.emit('register_identity', decoded.user.username);
            }
            const res = await axios.get(`${API_URL}api/users/list`);
            setUsers(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching users:', err);
            setLoading(false);
        }
    }, [socket]);

    const fetchLastSeen = useCallback(async (username) => {
        try {
            const res = await axios.get(`${API_URL}api/users/get-last-seen?username=${username}`);
            setLastSeenStatuses(prev => ({
                ...prev,
                [username]: res.data.lastSeen ? `last seen ${new Date(res.data.lastSeen).toLocaleString()}` : 'offline'
            }));
        } catch (error) {
            console.error('Error fetching last seen status:', error);
            setLastSeenStatuses(prev => ({
                ...prev,
                [username]: 'offline'
            }));
        }
    }, []);

    useEffect(() => {
        if (!isSearching) {
            fetchUsers();
        }
        
        // 💡 NEW: Listen for the full list of online users
        socket.on('online_users_list', (onlineUsernames) => {
            setOnlineUsers(new Set(onlineUsernames));
        });

        // 💡 NEW: Listen for individual status updates
        socket.on('user_status_update', ({ identity, status, lastSeen }) => {
            if (status.startsWith('last seen')) {
                setLastSeenStatuses(prev => ({
                    ...prev,
                    [identity]: status
                }));
            }
        });

        return () => {
            socket.off('online_users_list');
            socket.off('user_status_update');
        };
    }, [fetchUsers, isSearching, socket]);

    useEffect(() => {
        if (users.length > 0 && !isSearching) {
            users.forEach(user => {
                if (!onlineUsers.has(user.username)) {
                    fetchLastSeen(user.username);
                }
            });
        }
    }, [users, isSearching, onlineUsers, fetchLastSeen]);


    const handleViewUser = (user) => {
        navigate(`/chat/${user._id}/${user.username}`);
    };
    
    const handleAIChat = () => {
        navigate('/ai-chat');
    };
    
    // 💡 NEW: Function to navigate to UserDetail page
    const handleViewUserDetail = (user) => {
        navigate(`/user-detail/${user._id}`);
    };

    const renderProfileIcon = (user) => {
        if (user.profileImg) {
            return (
                <img src={user.profileImg} alt="profile" className="profile-img" />
            );
        }
        const firstLetter = user.username ? user.username.charAt(0).toUpperCase() : '';
        return firstLetter;
    };

    const usersToDisplay = isSearching ? searchResults : users;

    return (
        <div className="container mt-4">
            {loading && !isSearching ? (
                <p className="text-center">Loading users...</p>
            ) : (
                <ul className="list-group">
                    {usersToDisplay.length > 0 ? (
                        usersToDisplay.map((user) => {
                            const isOnline = onlineUsers.has(user.username);
                            const statusText = isOnline ? 'Online' : lastSeenStatuses[user.username] || 'Loading...';
                            
                            return (
                                <li 
                                    key={user._id} 
                                    className="user-item list-group-item d-flex align-items-center" 
                                    onClick={() => handleViewUser(user)}
                                >
                                    <div className="d-flex align-items-center flex-grow-1">
                                        <div className="user-profile-icon-container me-3" onClick={(e) => {
                                            e.stopPropagation(); // Prevents the list item from being clicked
                                            handleViewUserDetail(user);
                                        }}>
                                            <div className="user-profile-icon d-flex align-items-center justify-content-center">
                                                {renderProfileIcon(user)}
                                            </div>
                                            {isOnline && <div className="online-dot"></div>}
                                        </div>
                                        <div className="user-info">
                                            <h5 className="mb-0">{user.username}</h5>
                                            <small className="text-muted">{statusText}</small>
                                        </div>
                                    </div>
                                </li>
                            );
                        })
                    ) : (
                        <p className="text-center mt-3">No users found.</p>
                    )}
                </ul>
            )}
            
            <button className="btn btn-primary chat-ai-btn" onClick={handleAIChat}>
                <i className="fas fa-robot me-2"></i> Chat with AI
            </button>
        </div>
    );
};

export default UserList;