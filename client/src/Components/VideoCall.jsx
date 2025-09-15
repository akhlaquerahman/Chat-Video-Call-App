import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Video from 'twilio-video';
import axios from 'axios';
import '../Styles/VideoCall.css'; 

const VideoCall = () => {
    const { roomName, identity } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const callType = searchParams.get('type');
    const isAudioCall = callType === 'audio';

    const [room, setRoom] = useState(null);
    const [participants, setParticipants] = useState([]);
    const localVideoRef = useRef();
    const [callTimer, setCallTimer] = useState(0);

    // This useEffect handles connecting to the room
    useEffect(() => {
        const joinRoom = async () => {
            try {
                const response = await axios.get(`http://localhost:5000/twilio_token?identity=${identity}&roomName=${roomName}`);
                const token = response.data.token;

                const newRoom = await Video.connect(token, {
                    name: roomName,
                    audio: true,
                    video: !isAudioCall, // Video will be false if it's an audio call
                });

                setRoom(newRoom);
                console.log(`Joined the room:`, newRoom);

                // Attach local video track only if it's a video call
                if (!isAudioCall) {
                    const localTrack = await Video.createLocalVideoTrack();
                    if (localVideoRef.current) {
                        localVideoRef.current.appendChild(localTrack.attach());
                    }
                }

            } catch (error) {
                console.error('Error joining room:', error);
                navigate('/');
            }
        };

        if (identity && roomName) {
            joinRoom();
        }
    }, [roomName, identity, navigate, isAudioCall]);

    // This useEffect handles participants joining and leaving the room
    useEffect(() => {
        if (room) {
            const handleParticipantConnected = (participant) => {
                console.log(`Participant '${participant.identity}' connected`);
                setParticipants(prevParticipants => [...prevParticipants, participant]);
            };

            const handleParticipantDisconnected = (participant) => {
                console.log(`Participant '${participant.identity}' disconnected`);
                setParticipants(prevParticipants => prevParticipants.filter(p => p.sid !== participant.sid));
            };

            room.on('participantConnected', handleParticipantConnected);
            room.on('participantDisconnected', handleParticipantDisconnected);
            room.participants.forEach(handleParticipantConnected);

            return () => {
                room.off('participantConnected', handleParticipantConnected);
                room.off('participantDisconnected', handleParticipantDisconnected);
            };
        }
    }, [room]);

    // Timer Logic
    useEffect(() => {
        let timerInterval;
        if (room && participants.length > 0) {
            timerInterval = setInterval(() => {
                setCallTimer(prevTime => prevTime + 1);
            }, 1000);
        } else {
            setCallTimer(0);
        }
        return () => clearInterval(timerInterval);
    }, [room, participants]);

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const leaveRoom = () => {
        if (room) {
            room.disconnect();
            setRoom(null);
            navigate('/');
        }
    };
    
    const isConnected = participants.length > 0;
    const localVideoClassName = `local-video-overlay ${isConnected ? '' : 'waiting'}`;

    return (
        <div className="video-call-container">
            {room ? (
                <div className="call-interface">
                    {isConnected ? (
                        <>
                            {/* Remote video will only show if it's a video call */}
                            {!isAudioCall && (
                                <div className="remote-video-main">
                                    {participants.map(participant => (
                                        <RemoteParticipant key={participant.sid} participant={participant} isAudioCall={isAudioCall} />
                                    ))}
                                </div>
                            )}

                            {/* This overlay handles both audio and video call UI */}
                            <div className={`call-info-overlay ${isAudioCall ? 'audio-only' : 'video-call-ui'}`}>
                                {isAudioCall ? (
                                    <>
                                        <h1>{participants[0]?.identity}</h1>
                                        <p className="timer">{formatTime(callTimer)}</p>
                                    </>
                                ) : (
                                    <div className="video-call-controls-container">
                                        <div className="video-info">
                                            <h1>{participants[0]?.identity}</h1>
                                            <p className="timer">{formatTime(callTimer)}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="waiting-container">
                            <p>Waiting for the other person to receive call...</p>
                        </div>
                    )}
                    
                    {/* Local video overlay will only show if it's a video call */}
                    {!isAudioCall && (
                        <div className={localVideoClassName} ref={localVideoRef}></div>
                    )}
                    
                    {/* Control buttons */}
                    <div className="call-controls">
                        <button className="btn btn-danger" onClick={leaveRoom}>
                            <i className="fas fa-phone-slash"></i> End Call
                        </button>
                    </div>
                </div>
            ) : (
                <div className="connecting-message">
                    <p>Connecting...</p>
                </div>
            )}
        </div>
    );
};

const RemoteParticipant = ({ participant, isAudioCall }) => {
    const videoRef = useRef();
    const audioRef = useRef();

    useEffect(() => {
        const handleTrackSubscribed = (track) => {
            // Only attach video track if it's a video call
            if (track.kind === 'video' && !isAudioCall) {
                videoRef.current.appendChild(track.attach());
            } else if (track.kind === 'audio') {
                audioRef.current.appendChild(track.attach());
            }
        };
        
        participant.on('trackSubscribed', handleTrackSubscribed);
        
        participant.tracks.forEach(publication => {
            if (publication.isSubscribed) {
                handleTrackSubscribed(publication.track);
            }
        });

        return () => {
            participant.removeAllListeners('trackSubscribed');
            const tracks = Array.from(participant.tracks.values()).map(p => p.track);
            tracks.forEach(track => {
                if (track && track.detach) {
                    track.detach().forEach(el => el.remove());
                }
            });
        };
    }, [participant, isAudioCall]);

    return (
        <div className="remote-participant-container">
            {/* Don't render video ref if it's an audio call */}
            {!isAudioCall && <div className="remote-video" ref={videoRef}></div>}
            <div className="remote-audio" ref={audioRef}></div>
        </div>
    );
};

export default VideoCall;