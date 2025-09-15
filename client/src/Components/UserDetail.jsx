import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MediaViewer from './MediaViewer';
import '../Styles/UserDetail.css';

const UserDetail = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMedia, setSelectedMedia] = useState(null);

    useEffect(() => {
        const fetchUserAndMedia = async () => {
            try {
                // 💡 Fetch user details
                const userRes = await axios.get(`http://localhost:5000/api/users/${userId}`);
                setUser(userRes.data);

                // 💡 Fetch media shared with this user
                const token = localStorage.getItem('token');
                if (token) {
                    const mediaRes = await axios.get(`http://localhost:5000/api/chat/media/${userId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setMedia(mediaRes.data);
                }
            } catch (err) {
                console.error('Error fetching user details or media:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUserAndMedia();
    }, [userId]);

    const handleMediaClick = (media) => {
        setSelectedMedia(media);
    };

    const handleCloseMedia = () => {
        setSelectedMedia(null);
    };

    if (loading) {
        return <div className="text-center mt-5">Loading...</div>;
    }

    if (!user) {
        return <div className="text-center mt-5">User not found.</div>;
    }

    const renderProfileIcon = (userData) => {
        if (userData.profileImg) {
            return (
                <img src={userData.profileImg} alt="profile" className="profile-img-lg" />
            );
        }
        const firstLetter = userData.username ? userData.username.charAt(0).toUpperCase() : '';
        return <div className="profile-icon-lg">{firstLetter}</div>;
    };

    return (
        <div className="user-detail-page">
            <div className="user-detail-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h1 className="header-title">User Details</h1>
            </div>

            <div className="profile-section text-center p-4">
                {renderProfileIcon(user)}
                <h2 className="username mt-3">{user.username}</h2>
                <p className="email text-muted">{user.email}</p>
            </div>

            <div className="media-section p-3">
                <h3 className="section-title">Media, Files and Docs</h3>
                <div className="media-grid">
                    {media.length > 0 ? (
                        media.map((item, index) => (
                            <div key={index} className="media-item" onClick={() => handleMediaClick({ filePath: item.filePath, fileType: item.fileType })}>
                                {item.fileType === 'image' ? (
                                    <img src={item.filePath} alt="media" className="img-thumbnail" />
                                ) : item.fileType === 'video' ? (
                                    <video src={item.filePath} className="img-thumbnail" />
                                ) : (
                                    <div className="document-thumbnail">
                                        <i className="fas fa-file-alt fa-3x"></i>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-muted w-100 text-center">No media shared with this user.</p>
                    )}
                </div>
            </div>

            <MediaViewer media={selectedMedia} onClose={handleCloseMedia} />
        </div>
    );
};

export default UserDetail;