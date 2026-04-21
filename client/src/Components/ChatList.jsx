import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import API_URL from '../apiConfig';
import '../Styles/ChatList.css'; 

const ChatList = ({ socket, searchResults, isSearching, onUserSelect, selectedUser, unreadCounts = {}, lastMessageTimes = {} }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    const [lastSeenStatuses, setLastSeenStatuses] = useState({});
    
    const navigate = useNavigate();

    const fetchUsers = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }

            const res = await axios.get(`${API_URL}api/users/list`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setUsers(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching users:', err);
            setLoading(false);
        }
    }, []);

    const fetchLastSeen = useCallback(async (username) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await axios.get(`${API_URL}api/users/get-last-seen?username=${username}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
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
        
        socket.on('online_users_list', (onlineUsernames) => {
            setOnlineUsers(new Set(onlineUsernames));
        });

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
        if (onUserSelect) {
            onUserSelect(user);
        } else {
            navigate(`/chat/${user._id}/${user.username}`);
        }
    };

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

    const rawUsers = isSearching ? searchResults : users;
    const usersToDisplay = [...rawUsers].sort((a, b) => {
        const timeA = Math.max(
            lastMessageTimes[a._id] || 0,
            a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
        );
        const timeB = Math.max(
            lastMessageTimes[b._id] || 0,
            b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
        );
        return timeB - timeA;
    });

    return (
        <div className="chat-list-container">
            {loading && !isSearching ? (
                <p className="text-center">Loading users...</p>
            ) : (
                <ul className="chat-list">
                    {usersToDisplay.length > 0 ? (
                        usersToDisplay.map((user) => {
                            const isOnline = onlineUsers.has(user.username);
                            const unreadCount = unreadCounts[user._id] || 0;
                            
                            // 💡 Improved status logic: check real-time state first, then initially fetched user data
                            const lastSeenData = lastSeenStatuses[user.username];
                            let statusText = isOnline ? 'Online' : 'offline';
                            
                            if (!isOnline) {
                                if (lastSeenData) {
                                    statusText = lastSeenData;
                                } else if (user.lastSeen) {
                                    statusText = `last seen ${new Date(user.lastSeen).toLocaleString()}`;
                                }
                            }
                            
                            return (
                                <li 
                                    key={user._id} 
                                    className={`user-item ${selectedUser && selectedUser._id === user._id ? 'selected' : ''}`}
                                    onClick={() => handleViewUser(user)}
                                >
                                    <div className="d-flex align-items-center flex-grow-1">
                                        <div className="user-profile-icon-container me-3" onClick={(e) => {
                                            e.stopPropagation(); 
                                            handleViewUserDetail(user);
                                        }}>
                                            <div className="user-profile-icon d-flex align-items-center justify-content-center">
                                                {renderProfileIcon(user)}
                                            </div>
                                            {isOnline && <div className="online-dot"></div>}
                                        </div>
                                        <div className="user-info">
                                            <div className="user-meta-row">
                                                <h5 className="mb-0">{user.username}</h5>
                                                {unreadCount > 0 && <span className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
                                            </div>
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
        </div>
    );
};

export default ChatList;
