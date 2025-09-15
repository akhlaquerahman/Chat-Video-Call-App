import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../Styles/AIChatPage.css';
import { jwtDecode } from 'jwt-decode';

const AIChatPage = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const navigate = useNavigate();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchHistory = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await axios.get('http://localhost:5000/api/ai-chat/ai-history', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            // 💡 UPDATED: Store the full message object including createdAt
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching chat history:', error);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async () => {
        if (input.trim() === '') return;
        
        const token = localStorage.getItem('token');
        if (!token) {
            alert("Please log in to chat with the AI.");
            return;
        }

        // 💡 Create a temporary message object with a placeholder createdAt
        const userMessage = { role: 'user', content: input, createdAt: new Date() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/ai-chat', {
                userMessage: input,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // 💡 The backend now saves and sends a complete message object with createdAt
            const botMessage = { role: 'assistant', content: response.data.message, createdAt: new Date() };
            setMessages((prevMessages) => [...prevMessages, botMessage]);
        } catch (error) {
            console.error('Error sending message:', error);
            const errorMessage = {
                role: 'assistant',
                content: 'I am sorry, something went wrong. Please try again.',
            };
            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };
    
    const handleBack = () => {
        navigate(-1);
    };

    // 💡 NEW: Function to handle chat history deletion
    const handleDeleteChat = async () => {
        const isConfirmed = window.confirm("Are you sure you want to delete your entire AI chat history?");
        if (isConfirmed) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete('http://localhost:5000/api/ai-chat/delete-history', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setMessages([]); // Clear messages from state after successful deletion
                alert('AI chat history deleted successfully!');
            } catch (error) {
                console.error('Error deleting chat history:', error);
                alert('Failed to delete AI chat history.');
            }
        }
    };

    return (
        <div className="ai-chat-page">
            <div className="ai-chat-header">
                <button onClick={handleBack} className="back-btn">
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h1 className="ai-chat-title">AI Chatbot</h1>
                {/* 💡 NEW: Delete Button */}
                <button onClick={handleDeleteChat} className="delete-btn">
                    <i className="fas fa-trash-alt"></i>
                </button>
            </div>

            <div className="ai-chat-history">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`message-bubble-container ${msg.role === 'user' ? 'user-message-container' : 'bot-message-container'}`}
                    >
                        <div
                            className={`message-bubble ${msg.role === 'user' ? 'user-bubble' : 'bot-bubble'}`}
                        >
                            <p>{msg.content}</p>
                            {/* 💡 NEW: Display message timestamp */}
                            {msg.createdAt && (
                                <small className={`message-time ${msg.role === 'user' ? 'user-time' : 'bot-time'}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </small>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="message-bubble-container bot-message-container">
                        <div className="message-bubble bot-bubble">
                            <div className="loading-dots">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="ai-chat-input-area">
                <textarea
                    className="chat-input"
                    rows="1"
                    placeholder="Type your message here..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                ></textarea>
                <button
                    onClick={handleSendMessage}
                    className="send-btn"
                    disabled={isLoading || input.trim() === ''}
                >
                    <i className="fas fa-paper-plane"></i>
                </button>
            </div>
        </div>
    );
};

export default AIChatPage;