import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import ChatNavbar from './ChatNavbar';
import CallNotification from './CallNotification';
import MediaViewer from './MediaViewer';
import axios from 'axios';
import '../Styles/ChatPage.css';

const ChatPage = ({ socket }) => {
    const { otherUserId, otherUserUsername } = useParams();
    const navigate = useNavigate();

    const [currentUserId, setCurrentUserId] = useState(null);
    const [currentUserProfile, setCurrentUserProfile] = useState(null); // 💡 NEW: State for current user's profile
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [incomingCall, setIncomingCall] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [filePreviewName, setFilePreviewName] = useState('');

    const [lastSeenStatus, setLastSeenStatus] = useState('');
    const [otherUserProfileImg, setOtherUserProfileImg] = useState(null);
    const [otherUserStatus, setOtherUserStatus] = useState('Loading...');
    
    const [selectedMedia, setSelectedMedia] = useState(null);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const createRoomName = useCallback(() => {
        if (!currentUserId || !otherUserId) return null;
        const sortedIds = [currentUserId, otherUserId].sort();
        return sortedIds.join('-');
    }, [currentUserId, otherUserId]);

    // 💡 First useEffect to get current user data and register with socket
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setCurrentUserId(decoded.user.id);
                setCurrentUserProfile(decoded.user); // 💡 Store the full user object
                socket.emit('register_identity', decoded.user.username);
            } catch (err) {
                console.error("Error decoding token:", err);
            }
        }
        
        socket.on('incoming_call', ({ roomName, callerIdentity, callType }) => {
            setIncomingCall({ roomName, callerIdentity, callType });
        });

        return () => {
            socket.off('incoming_call');
        };
    }, [socket]);

    // 💡 Second useEffect for chat logic and fetching data
    useEffect(() => {
        const fetchUserData = async () => {
            // Fetch other user's profile data
            try {
                const res = await axios.get(`http://localhost:5000/api/users/${otherUserId}`);
                setOtherUserProfileImg(res.data.profileImg);
            } catch (err) {
                console.error('Error fetching other user details:', err);
            }
        };

        if (currentUserId && otherUserId && currentUserProfile) {
            const roomName = createRoomName();
            if (roomName) {
                socket.emit('join_chat_room', roomName);
            }
            
            socket.emit('request_user_status', { targetUser: otherUserUsername });

            socket.on('initial_status', ({ identity, status }) => {
                if (identity === otherUserUsername) {
                    if (status.startsWith('last seen')) {
                        setLastSeenStatus(status);
                    }
                    setOtherUserStatus(status);
                }
            });

            // This is where chat history is fetched from the backend.
            socket.on('receive_message_history', (history) => {
                setMessages(history);
            });

            socket.on('receive_message', (message) => {
                setMessages(prev => [...prev, message]);
            });

            socket.on('user_status_update', ({ identity, status }) => {
                if (identity === otherUserUsername) {
                    if (status === 'online') {
                        setOtherUserStatus('online');
                        setLastSeenStatus('');
                    } else if (status.startsWith('last seen')) {
                        setOtherUserStatus(status);
                        setLastSeenStatus(status);
                    }
                }
            });

            socket.on('user_typing_update', ({ identity, status }) => {
                if (identity === otherUserUsername) {
                    if (status === 'typing') {
                        setOtherUserStatus('typing...');
                    } else {
                        if (lastSeenStatus) {
                            setOtherUserStatus(lastSeenStatus);
                        } else {
                            setOtherUserStatus('online');
                        }
                    }
                }
            });
            
            fetchUserData();

            return () => {
                socket.off('receive_message_history');
                socket.off('receive_message');
                socket.off('user_status_update');
                socket.off('user_typing_update');
                socket.off('initial_status');
            };
        }
    }, [socket, currentUserId, otherUserId, createRoomName, otherUserUsername, lastSeenStatus, currentUserProfile]);

    const handleMediaClick = (media) => {
        setSelectedMedia(media);
    };

    const handleCloseMedia = () => {
        setSelectedMedia(null);
    };

    const handleInput = (e) => {
        setInput(e.target.value);
        const roomName = createRoomName();
        if (roomName) {
            if (e.target.value.length > 0) {
                socket.emit('typing', { roomName, typingUser: currentUserProfile.username });
            } else {
                socket.emit('stop_typing', { roomName, typingUser: currentUserProfile.username });
            }
        }
    };
    
    const handleAnswerCall = () => {
        if (incomingCall) {
            const callType = incomingCall.callType || 'video';
            navigate(`/call/${incomingCall.roomName}/${currentUserProfile.username}?type=${callType}`);
            setIncomingCall(null);
        }
    };

    const handleCall = (type) => {
        const roomName = createRoomName();
        if (!roomName) {
            console.error("Room name could not be created.");
            return;
        }
        socket.emit('call_user', { userToCall: otherUserUsername, roomName, callerIdentity: currentUserProfile.username, callType: type });
        navigate(`/call/${roomName}/${currentUserProfile.username}?type=${type}`);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) {
            setSelectedFile(null);
            setFilePreview(null);
            setFilePreviewName('');
            return;
        }

        setSelectedFile(file);
        setFilePreviewName(file.name);

        if (file.type.startsWith('image') || file.type.startsWith('video')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreview(reader.result);
            };
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }
    };
    
    const clearSelectedFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
        setFilePreviewName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!input.trim() && !selectedFile) || !currentUserId || !otherUserId) {
             alert('Please enter a message or select a file to send.');
             return;
        }

        const roomName = createRoomName();
        if (!roomName) {
            console.error("Room name could not be created.");
            return;
        }

        let filePath = null;
        let fileType = null;

        if (selectedFile) {
            const formData = new FormData();
            formData.append('media', selectedFile);

            try {
                const res = await axios.post('http://localhost:5000/api/uploads/media', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
                filePath = res.data.filePath;
                fileType = selectedFile.type.startsWith('image') ? 'image' :
                           selectedFile.type.startsWith('video') ? 'video' : 'document';
            } catch (err) {
                console.error('Error uploading file:', err);
                alert('File upload failed.');
                return;
            }
        }

        const message = {
            senderId: currentUserId,
            receiverId: otherUserId,
            text: input.trim() || null,
            filePath,
            fileType,
        };

        socket.emit('send_message', { roomName, message });

        socket.emit('stop_typing', { roomName, typingUser: currentUserProfile.username });

        setInput('');
        clearSelectedFile();
    };

    const handleDeleteChat = async () => {
        const roomName = createRoomName();
        if (!roomName) {
            alert("Room name is invalid.");
            return;
        }

        const isConfirmed = window.confirm("Are you sure you want to delete this chat?");
        if (isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5000/api/chat/${roomName}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setMessages([]);
                alert('Chat deleted successfully!');
            } catch (err) {
                console.error('Error deleting chat:', err.response ? err.response.data : err.message);
                alert('Failed to delete chat history.');
            }
        }
    };

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleViewUserDetail = () => {
        navigate(`/user-detail/${otherUserId}`);
    };

    const renderProfileIcon = (user) => {
        const profileImg = user?.profileImg;
        if (profileImg) {
            return (
                <img src={profileImg} alt="profile" className="profile-img-small" />
            );
        }
        const firstLetter = user?.username ? user.username.charAt(0).toUpperCase() : '';
        return <div className="profile-icon-small">{firstLetter}</div>;
    };


    return (
        <div className="chat-page-container d-flex flex-column" style={{ height: '100vh' }}>
            <ChatNavbar 
                otherUserUsername={otherUserUsername} 
                otherUserStatus={otherUserStatus}
                otherUserProfileImg={otherUserProfileImg}
                handleCall={() => handleCall('video')}
                handleAudioCall={() => handleCall('audio')}
                handleDeleteChat={handleDeleteChat}
                handleViewUserDetail={handleViewUserDetail}
            />
            <CallNotification 
                incomingCall={incomingCall} 
                handleAnswerCall={handleAnswerCall} 
            />
            <div className="chat-history flex-grow-1 overflow-auto border p-3 rounded" style={{ backgroundColor: '#e5ddd5' }}>
                {messages.map((msg, index) => {
                    const isSender = (msg.senderId && msg.senderId._id) ? msg.senderId._id === currentUserId : msg.senderId === currentUserId;
                    
                    // 💡 NEW: Get sender's profile data
                    const senderProfile = isSender ? currentUserProfile : { username: otherUserUsername, profileImg: otherUserProfileImg };

                    return (
                        <div key={index} className={`d-flex align-items-end ${isSender ? 'justify-content-end' : 'justify-content-start'}`}>
                            {/* 💡 RENDER profile icon for the other user */}
                            {!isSender && (
                                <div className="chat-profile-icon-wrapper me-2">
                                    {renderProfileIcon(senderProfile)}
                                </div>
                            )}
                            <div className={`p-2 rounded mb-2 ${isSender ? 'bg-success text-white' : 'bg-light text-dark'}`} style={{ maxWidth: '75%' }}>
                                {/* 💡 REMOVED: 'You' or 'username' */}
                                {msg.filePath && (
                                    <div className="mb-2" onClick={() => handleMediaClick({ filePath: msg.filePath, fileType: msg.fileType })}>
                                        {msg.fileType === 'image' ? (
                                            <img src={msg.filePath} alt="media" className="img-fluid media-preview-image" />
                                        ) : msg.fileType === 'video' ? (
                                            <video src={msg.filePath} className="img-fluid media-preview-video" />
                                        ) : (
                                            <a href={msg.filePath} target="_blank" rel="noopener noreferrer" className="d-block text-decoration-none">
                                                <i className="fas fa-file me-2"></i> Document
                                            </a>
                                        )}
                                    </div>
                                )}
                                {msg.text && <p className="mb-0">{msg.text}</p>}
                                {msg.createdAt && (
                                    <small className={`d-block mt-1 ${isSender ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.75rem' }}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </small>
                                )}
                            </div>
                            {/* 💡 RENDER profile icon for the current user */}
                            {isSender && (
                                <div className="chat-profile-icon-wrapper ms-2">
                                    {renderProfileIcon(senderProfile)}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={messagesEndRef}></div>
            </div>

            {(filePreview || filePreviewName) && (
                <div className="file-preview-container d-flex align-items-center p-2 border-top bg-light">
                    {filePreview && (
                        filePreviewName.match(/\.(jpeg|jpg|png|gif)$/i) ? (
                            <img src={filePreview} alt="File preview" className="img-thumbnail me-2" style={{ maxWidth: '60px', maxHeight: '60px' }} />
                        ) : (
                            <i className="fas fa-file-alt fa-2x me-2"></i>
                        )
                    )}
                    <span className="text-truncate flex-grow-1">{filePreviewName}</span>
                    <button type="button" className="btn-close ms-2" aria-label="Close" onClick={clearSelectedFile}></button>
                </div>
            )}

            <form onSubmit={sendMessage} className="d-flex mt-3 mb-3 px-3">
                <input
                    type="text"
                    className="form-control me-2"
                    value={input}
                    onChange={handleInput}
                    placeholder={selectedFile ? `Add a caption...` : `Type a message...`}
                />
                <label className="btn btn-secondary me-2">
                    <i className="fas fa-paperclip"></i>
                    <input type="file" onChange={handleFileSelect} ref={fileInputRef} style={{ display: 'none' }} />
                </label>
                <button type="submit" className="btn btn-primary">Send</button>
            </form>

            <MediaViewer media={selectedMedia} onClose={handleCloseMedia} />
        </div>
    );
};

export default ChatPage;