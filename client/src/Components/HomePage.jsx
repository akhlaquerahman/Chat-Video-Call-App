import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import UserList from './UserList';
import CallNotification from './CallNotification';
import ProfileDropdown from './ProfileDropdown'; 
import EditProfileForm from './EditProfileForm';
import '../Styles/HomePage.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// 💡 HomePage अब `setCurrentUser` को एक प्रॉप के रूप में लेता है
const HomePage = ({ token, setToken, socket, setCurrentUser }) => {
    const [incomingCall, setIncomingCall] = useState(null);
    const [localUser, setLocalUser] = useState(null); // लोकल स्टेट का उपयोग करें
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    
    // 💡 NEW: State for search functionality
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    // 💡 NEW: State for room functionality
    const [showRoomModal, setShowRoomModal] = useState(false);
    const [roomName, setRoomName] = useState('');
    const [callType, setCallType] = useState('video');

    const navigate = useNavigate();

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken('');
        setCurrentUser(null); // 💡 Global state को भी अपडेट करें
        setLocalUser(null);
        setIncomingCall(null);
        navigate('/');
    }, [setToken, navigate, setCurrentUser]);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['x-auth-token'] = token;
            try {
                const decoded = jwtDecode(token);
                const currentTime = Date.now() / 1000;
                if (decoded.exp < currentTime) {
                    console.error('Token expired, logging out.');
                    logout();
                } else {
                    setLocalUser(decoded.user);
                    setCurrentUser(decoded.user); // 💡 Global state को अपडेट करें
                    socket.emit('register_identity', decoded.user.username);
                }
            } catch (error) {
                console.error('Failed to decode token:', error);
                logout(); 
            }
        } else {
            delete axios.defaults.headers.common['x-auth-token'];
        }
        
        socket.on('incoming_call', ({ roomName, callerIdentity, callType }) => {
            setIncomingCall({ roomName, callerIdentity, callType });
        });

        return () => {
            socket.off('incoming_call');
        };
    }, [token, socket, logout, setCurrentUser]);

    const handleAnswerCall = () => {
        if (incomingCall) {
            const callType = incomingCall.callType || 'video';
            navigate(`/call/${incomingCall.roomName}/${localUser.username}?type=${callType}`);
            setIncomingCall(null);
        }
    };
    
    const handleDeleteAccount = async () => {
        const isConfirmed = window.confirm('Are you sure you want to delete your account? This action cannot be undone.');
        if (isConfirmed) {
            try {
                await axios.delete(`http://localhost:5000/api/users/${localUser.id}`, {
                    headers: { 'x-auth-token': token }
                });
                alert('Your account has been deleted.');
                logout();
            } catch (err) {
                console.error('Error deleting account:', err);
                alert('Failed to delete account.');
            }
        }
    };

    const handleEditProfile = () => {
        setIsEditingProfile(true);
    };

    const handleProfileUpdated = (updatedUser) => {
        setLocalUser(updatedUser);
        setCurrentUser(updatedUser); // 💡 Global state को भी अपडेट करें
        setIsEditingProfile(false);
    };

    const handleCancelEdit = () => {
        setIsEditingProfile(false);
    };

    // 💡 NEW: Search functionality functions
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]); // Clear results if search query is empty
            setIsSearching(false);
            return;
        }

        try {
            const res = await axios.get(`http://localhost:5000/api/users/search?query=${searchQuery}`);
            setSearchResults(res.data);
        } catch (err) {
            console.error('Error searching for users:', err);
            setSearchResults([]);
        }
    };

    const toggleSearch = () => {
        setIsSearching(!isSearching);
        // Clear search state when closing the search bar
        if (isSearching) {
            setSearchQuery('');
            setSearchResults([]);
        }
    };
    
    // 💡 NEW: Room functionality handlers
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
    
    // A small idea: add a unique room name generator
    const generateUniqueRoomName = () => {
        const uniqueId = Math.random().toString(36).substring(2, 8);
        setRoomName(`Room-${uniqueId}`);
    };

    return (
        <div className="App">
  <header className="App-header">
    <div className='d-flex align-items-center justify-content-between py-3 px-3 border-bottom bg-light homepage-header'>
      {/* App title */}
      <h2 className="mb-0 me-3">My Chat Video Call App</h2>

      {/* Right side elements with minimal spacing */}
      <div className="d-flex align-items-center" style={{ gap: '8px' }}>
        {/* Search button and bar */}
        <div className="d-flex align-items-center">
          <button className="btn btn-outline-secondary" onClick={toggleSearch}>
            <i className="fas fa-search"></i>
          </button>
          {isSearching && (
            <div className="search-bar ms-2">
              <input
                type="text"
                className="form-control"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyUp={handleSearch}
              />
            </div>
          )}
        </div>
        
        {/* Join Room button */}
        <button className="btn btn-info text-white" onClick={() => setShowRoomModal(true)}>
          <i className="fas fa-video me-1"></i>Join
        </button>
        
        {/* Profile dropdown */}
        {localUser && (
          <ProfileDropdown 
            user={localUser} 
            onLogout={logout} 
            onDeleteAccount={handleDeleteAccount}
            onEditProfile={handleEditProfile}
          />
        )}
      </div>
    </div>
    <CallNotification incomingCall={incomingCall} handleAnswerCall={handleAnswerCall} />
  </header>
  
  {/* Rest of the component remains the same */}
  {isEditingProfile ? (
    <EditProfileForm 
      currentUser={localUser}
      onProfileUpdated={handleProfileUpdated}
      onCancelEdit={handleCancelEdit}
    />
  ) : (
    <UserList socket={socket} searchResults={searchResults} isSearching={isSearching} />
  )}
  
  {/* Modal for Creating/Joining Rooms */}
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
                className="form-control" 
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