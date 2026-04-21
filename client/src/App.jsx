import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { io } from 'socket.io-client';
import './App.css';
import API_URL from './apiConfig';

// Import components
import Register from './Components/Register';
import Login from './Components/Login';
import HomePage from './Components/HomePage';
import ChatPage from './Components/ChatPage';
import VideoCall from './Components/VideoCall';
import AIChatPage from './Components/AIChatPage';
import UserDetail from './Components/UserDetail';
import ForgotPassword from './Components/ForgotPassword';

const SOCKET_URL = API_URL.replace(/\/$/, '');
const socket = io(SOCKET_URL);

function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [currentUser, setCurrentUser] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('darkMode') === 'true');
    const [unreadCounts, setUnreadCounts] = useState({});
    const [lastMessageTimes, setLastMessageTimes] = useState({});

    const processedMessages = React.useRef(new Set());

    useEffect(() => {
        if (!socket || !token) return;
        
        // Register identity globally to receive notifications
        try {
            const decoded = jwtDecode(token);
            if (decoded?.user?.username) {
                socket.emit('register_identity', decoded.user.username);
            }
        } catch (e) {}

        const handleIncomingMessage = (message) => {
            if (!message?._id || processedMessages.current.has(message._id)) return;
            processedMessages.current.add(message._id);

            // Get sender ID
            const senderId = message?.senderId?._id || message?.senderId;
            
            // 💡 NEW: Update last message time for sorting
            if (senderId) {
                setLastMessageTimes((prev) => ({
                    ...prev,
                    [senderId]: Date.now(),
                }));
            }

            // Get current user ID
            let currentUserId = currentUser?.id;
            if (!currentUserId && token) {
                try {
                    const decoded = jwtDecode(token);
                    currentUserId = decoded.user.id;
                } catch(e) {}
            }

            if (!senderId || senderId === currentUserId) return;
            
            // 💡 NEW: Don't increment if we are currently in a chat with this sender
            const currentPath = window.location.pathname;
            if (currentPath.includes(`/chat/${senderId}`)) return;

            setUnreadCounts((prev) => ({
                ...prev,
                [senderId]: (prev[senderId] || 0) + 1,
            }));
        };

        socket.on('receive_notification', handleIncomingMessage);
        return () => socket.off('receive_notification', handleIncomingMessage);
    }, [token, currentUser]);

    const toggleDarkMode = () => {
        const nextMode = !isDarkMode;
        setIsDarkMode(nextMode);
        localStorage.setItem('darkMode', nextMode);
    };

    return (
        <div className={isDarkMode ? 'dark-mode-root dark-mode' : ''}>
            <Router>
                <Routes>
                    <Route path="/" element={token ? (
                        <HomePage 
                            token={token} 
                            setToken={setToken} 
                            socket={socket} 
                            setCurrentUser={setCurrentUser} 
                            isDarkMode={isDarkMode}
                            toggleDarkMode={toggleDarkMode}
                            unreadCounts={unreadCounts}
                            setUnreadCounts={setUnreadCounts}
                            lastMessageTimes={lastMessageTimes}
                            setLastMessageTimes={setLastMessageTimes}
                        />
                    ) : (
                        <Login setToken={setToken} />
                    )} 
                    />
                    <Route path="/register" element={<Register setToken={setToken} />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/chat/:otherUserId/:otherUserUsername" element={
                        <ChatPage socket={socket} currentUser={currentUser} isDarkMode={isDarkMode}/>
                    } />
                    <Route path="/call/:roomName/:identity" element={<VideoCall />} />
                    <Route path="/ai-chat" element={<AIChatPage />} />
                    <Route path="/user-detail/:userId" element={<UserDetail />} />
                </Routes>
            </Router>
        </div>
    );
}

export default App;
