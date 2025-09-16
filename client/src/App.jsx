import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { io } from 'socket.io-client';
import './App.css';

// Import components
import Register from './Components/Register';
import Login from './Components/Login';
import HomePage from './Components/HomePage';
import ChatPage from './Components/ChatPage';
import VideoCall from './Components/VideoCall';
// 💡 NEW: Import the AIChatPage
import AIChatPage from './Components/AIChatPage';
import UserDetail from './Components/UserDetail';

const socket = io('https://chat-video-call-app-f1lq.onrender.com'); 

function App() {
    const [token, setToken] = useState(localStorage.getItem('token') || '');
    const [currentUser, setCurrentUser] = useState(null);

    return (
        <Router>
            <Routes>
                <Route path="/" element={token ? (
                    <HomePage token={token} setToken={setToken} socket={socket} setCurrentUser={setCurrentUser} />
                ) : (
                    <Login setToken={setToken} />
                )} 
                />
                <Route path="/register" element={<Register />} />
                <Route path="/chat/:otherUserId/:otherUserUsername" element={
                    <ChatPage socket={socket} currentUser={currentUser}/>
                } />
                <Route path="/call/:roomName/:identity" element={<VideoCall />} />
                {/* 💡 NEW: Add route for the AI Chat page */}
                <Route path="/ai-chat" element={<AIChatPage />} />
                <Route path="/user-detail/:userId" element={<UserDetail />} />
            </Routes>
        </Router>
    );
}

export default App;