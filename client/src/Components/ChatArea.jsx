import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import MediaViewer from './MediaViewer';
import API_URL from '../apiConfig';
import '../Styles/ChatPage.css';

const getMessageText = (message) => message?.text || message?.content || '';
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isImage = (type = '') => type.startsWith('image');
const isVideo = (type = '') => type.startsWith('video');
const isAudio = (type = '') => type.startsWith('audio');
const isPdf = (item) => item?.fileType === 'application/pdf' || item?.fileName?.toLowerCase().endsWith('.pdf') || item?.filePath?.toLowerCase().includes('.pdf');
const isMessageDeleted = (message) => Boolean(message?.deletedForEveryone);

const getAudioExtension = (mimeType = '') => {
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mp4')) return 'm4a';
    if (mimeType.includes('opus')) return 'opus';
    return 'webm';
};

const getUploadErrorMessage = (error, fallback) => (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
);

const getMessageDate = (message) => {
    const rawDate = message.createdAt || message.timestamp;
    return rawDate ? new Date(rawDate) : null;
};

const isSameDay = (firstDate, secondDate) => (
    firstDate &&
    secondDate &&
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
);

const formatDateHeader = (date) => {
    if (!date) return '';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return 'Today';
    if (isSameDay(date, yesterday)) return 'Yesterday';

    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((startOfToday - startOfDate) / (1000 * 60 * 60 * 24));

    if (diffDays > 1 && diffDays < 7) {
        return date.toLocaleDateString(undefined, { weekday: 'long' });
    }

    return date.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const getMessageMedia = (message) => {
    if (Array.isArray(message?.mediaItems) && message.mediaItems.length > 0) {
        return message.mediaItems;
    }

    const filePath = message?.filePath || message?.fileUrl;
    if (!filePath) return [];

    return [{
        filePath,
        fileType: message.fileType || '',
        fileName: message.fileName || 'Shared file',
    }];
};

const summarizeMessage = (message) => {
    if (!message) return '';
    if (getMessageText(message)) return getMessageText(message);

    const mediaItems = getMessageMedia(message);
    if (mediaItems.length > 1) return `${mediaItems.length} attachments`;
    const firstItem = mediaItems[0];
    if (!firstItem) return 'Message';
    if (isPdf(firstItem)) return firstItem.fileName || 'PDF document';
    if (isAudio(firstItem.fileType)) return 'Voice message';
    if (isVideo(firstItem.fileType)) return 'Video';
    if (isImage(firstItem.fileType)) return 'Photo';
    return firstItem.fileName || 'Attachment';
};

const formatTimestamp = (value) => {
    if (!value) return 'Not yet';
    const date = new Date(value);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const ImageThumb = ({ item, index, count, onOpen }) => {
    const [loaded, setLoaded] = useState(false);

    return (
        <button
            type="button"
            className={`image-message gallery-thumb ${loaded ? 'loaded' : ''}`}
            onClick={() => onOpen(index)}
            aria-label={`Open image ${index + 1}`}
        >
            {!loaded && <span className="image-skeleton"></span>}
            <img src={item.filePath} alt={item.fileName || 'Shared image'} onLoad={() => setLoaded(true)} />
            {index === 3 && count > 4 && <span className="gallery-more">+{count - 4}</span>}
        </button>
    );
};

const ChatArea = ({ socket, selectedUser, currentUser, onBackToList, isDarkMode, setLastMessageTimes }) => {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [otherUserStatus, setOtherUserStatus] = useState('Loading...');
    const [selectedMedia, setSelectedMedia] = useState(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [messageSearch, setMessageSearch] = useState('');
    const [activeMatchIndex, setActiveMatchIndex] = useState(0);
    const [reportText, setReportText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const [failedUpload, setFailedUpload] = useState(null);
    const [editingMessageId, setEditingMessageId] = useState(null);
    const [editText, setEditText] = useState('');
    const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
    const [replyingTo, setReplyingTo] = useState(null);
    const [toast, setToast] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [messageInfoTarget, setMessageInfoTarget] = useState(null);
    const [forwardingMessage, setForwardingMessage] = useState(null);
    const [forwardContacts, setForwardContacts] = useState([]);
    const [isLoadingForwardContacts, setIsLoadingForwardContacts] = useState(false);

    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const messageRefs = useRef({});
    const menuRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordingChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);
    const recordingCancelledRef = useRef(false);
    const longPressTimerRef = useRef(null);

    const token = localStorage.getItem('token');

    const createRoomName = useCallback((firstId = currentUser?.id, secondId = selectedUser?._id) => {
        if (!firstId || !secondId) return null;
        const sortedIds = [firstId, secondId].sort();
        return sortedIds.join('-');
    }, [currentUser, selectedUser]);

    const selectedPreviews = useMemo(() => selectedFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
        isImage: file.type.startsWith('image'),
        isVideo: file.type.startsWith('video'),
        isAudio: file.type.startsWith('audio'),
        isPdf: file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'),
    })), [selectedFiles]);

    useEffect(() => () => {
        selectedPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [selectedPreviews]);

    useEffect(() => {
        if (!toast) return undefined;
        const timer = window.setTimeout(() => setToast(''), 2200);
        return () => window.clearTimeout(timer);
    }, [toast]);

    useEffect(() => () => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
        }
    }, []);

    const isOnline = otherUserStatus === 'online' || otherUserStatus === 'typing...';
    const readableStatus = otherUserStatus === 'online' ? 'Online' : otherUserStatus;

    const searchMatches = useMemo(() => {
        const query = messageSearch.trim().toLowerCase();
        if (!query) return [];

        return messages.reduce((matches, message, index) => {
            const text = getMessageText(message).toLowerCase();
            if (text.includes(query)) {
                matches.push({
                    index,
                    key: message._id || message.createdAt || message.timestamp || index,
                });
            }
            return matches;
        }, []);
    }, [messages, messageSearch]);

    useEffect(() => {
        setActiveMatchIndex(0);
    }, [messageSearch, selectedUser]);

    useEffect(() => {
        if (!selectedUser || !currentUser) return;

        setMessages([]);
        setOtherUserStatus('Loading...');
        setIsMenuOpen(false);
        setActiveModal(null);
        setIsSearchOpen(false);
        setMessageSearch('');
        setSelectedFiles([]);
        setReplyingTo(null);
        setForwardingMessage(null);
        setDeleteTarget(null);
        setMessageInfoTarget(null);

        const roomName = createRoomName();
        if (roomName) {
            socket.emit('join_chat_room', { roomName, userId: currentUser.id });
        }

        socket.emit('request_user_status', { targetUser: selectedUser.username });

        const handleInitialStatus = ({ identity, status }) => {
            if (identity === selectedUser.username) {
                setOtherUserStatus(status === 'online' ? 'online' : status || 'offline');
            }
        };

        const handleMessageHistory = (history) => {
            setMessages(history);
        };

        const handleReceiveMessage = (message) => {
            const senderId = message.senderId?._id || message.senderId;
            const receiverId = message.receiverId?._id || message.receiverId;

            if (senderId === selectedUser._id || receiverId === selectedUser._id) {
                setMessages((prev) => {
                    const incomingId = message._id;
                    if (incomingId && prev.some((existing) => existing._id === incomingId)) {
                        return prev;
                    }
                    return [...prev, message];
                });
            }
        };

        const handleStatusUpdate = ({ identity, status }) => {
            if (identity === selectedUser.username) {
                setOtherUserStatus(status === 'online' ? 'online' : status || 'offline');
            }
        };

        const handleTypingUpdate = ({ identity, status }) => {
            if (identity === selectedUser.username) {
                setOtherUserStatus(status);
            }
        };

        const handleMessageSeen = ({ messageId, status, seenAt, deliveredAt }) => {
            setMessages((prev) => prev.map((message) => (
                message._id === messageId ? { ...message, status: status || 'seen', seenAt, deliveredAt: deliveredAt || message.deliveredAt } : message
            )));
        };

        const handleMessageEdited = ({ messageId, newText, editedAt }) => {
            setMessages((prev) => prev.map((message) => (
                message._id === messageId ? { ...message, text: newText, editedAt } : message
            )));

            if (editingMessageId === messageId) {
                setEditingMessageId(null);
                setEditText('');
            }
        };

        const handleEditMessageError = ({ error }) => {
            alert(error || 'Failed to edit message.');
        };

        const handleMessageDeleted = ({ messageId, deletedAt }) => {
            setMessages((prev) => prev.map((message) => (
                message._id === messageId
                    ? {
                        ...message,
                        deletedForEveryone: true,
                        deletedForEveryoneAt: deletedAt,
                        text: null,
                        filePath: null,
                        fileType: null,
                        mediaItems: [],
                        mediaGroupId: null,
                        replyTo: null,
                        forwardedFrom: null,
                    }
                    : message
            )));
            setSelectedMedia((prev) => (prev?.messageId === messageId ? null : prev));
        };

        socket.on('initial_status', handleInitialStatus);
        socket.on('receive_message_history', handleMessageHistory);
        socket.on('receive_message', handleReceiveMessage);
        socket.on('user_status_update', handleStatusUpdate);
        socket.on('user_typing_update', handleTypingUpdate);
        socket.on('message-seen', handleMessageSeen);
        socket.on('message-edited', handleMessageEdited);
        socket.on('edit-message-error', handleEditMessageError);
        socket.on('message-deleted', handleMessageDeleted);

        return () => {
            socket.off('initial_status', handleInitialStatus);
            socket.off('receive_message_history', handleMessageHistory);
            socket.off('receive_message', handleReceiveMessage);
            socket.off('user_status_update', handleStatusUpdate);
            socket.off('user_typing_update', handleTypingUpdate);
            socket.off('message-seen', handleMessageSeen);
            socket.off('message-edited', handleMessageEdited);
            socket.off('edit-message-error', handleEditMessageError);
            socket.off('message-deleted', handleMessageDeleted);
        };
    }, [selectedUser, currentUser, socket, createRoomName, editingMessageId]);

    useEffect(() => {
        if (!currentUser?.id || !selectedUser?._id) return;

        messages.forEach((message) => {
            const senderId = message.senderId?._id || message.senderId;
            const receiverId = message.receiverId?._id || message.receiverId;
            if (senderId === selectedUser._id && receiverId === currentUser.id && message.status !== 'seen' && message._id && !isMessageDeleted(message)) {
                socket.emit('message-read', { messageId: message._id, userId: currentUser.id });
            }
        });
    }, [messages, selectedUser, currentUser, socket]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }

            if (!event.target.closest('.message-actions')) {
                setOpenMessageMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isSearchOpen && searchMatches.length > 0) {
            const match = searchMatches[activeMatchIndex];
            messageRefs.current[match.key]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeMatchIndex, searchMatches, isSearchOpen]);

    useEffect(() => {
        if (!isSearchOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isSearchOpen]);

    const showToast = (message) => setToast(message);

    const clearLongPressTimer = useCallback(() => {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const getSenderName = useCallback((message) => {
        const senderId = message?.senderId?._id || message?.senderId;
        if (senderId === currentUser?.id) {
            return currentUser?.username || 'You';
        }

        return message?.senderId?.username || message?.senderName || selectedUser?.username || 'Unknown';
    }, [currentUser, selectedUser]);

    const buildReplyPayload = useCallback((message) => {
        const mediaItems = getMessageMedia(message);
        const firstItem = mediaItems[0];

        return {
            messageId: message._id,
            senderId: message.senderId?._id || message.senderId,
            senderName: getSenderName(message),
            text: getMessageText(message) || null,
            fileType: firstItem?.fileType || message.fileType || null,
            fileName: firstItem?.fileName || message.fileName || null,
            mediaCount: mediaItems.length,
        };
    }, [getSenderName]);

    const buildForwardedFrom = useCallback((message) => {
        const originalSenderId = message.forwardedFrom?.senderId || message.senderId?._id || message.senderId;
        const originalSenderName = message.forwardedFrom?.senderName || getSenderName(message);

        return {
            messageId: message._id,
            senderId: originalSenderId,
            senderName: originalSenderName,
        };
    }, [getSenderName]);

    const handleCall = (type) => {
        const roomName = createRoomName();
        if (!roomName || !selectedUser || !currentUser) return;

        socket.emit('call_user', {
            userToCall: selectedUser.username,
            roomName,
            callerIdentity: currentUser.username,
            callType: type,
        });
        navigate(`/call/${roomName}/${currentUser.username}?type=${type}`);
    };

    const handleInputChange = (event) => {
        setInput(event.target.value);
        const roomName = createRoomName();
        if (!roomName || !currentUser?.username) return;

        socket.emit(event.target.value.length > 0 ? 'typing' : 'stop_typing', {
            roomName,
            typingUser: currentUser.username,
        });
    };

    const clearSelectedFiles = () => {
        setSelectedFiles([]);
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleFileSelect = (event) => {
        const files = Array.from(event.target.files || []);
        setSelectedFiles(files.slice(0, 10));
    };

    const uploadFiles = async (files, options = {}) => {
        const { clearError = true } = options;
        if (files.length === 0) return [];

        const formData = new FormData();
        files.forEach((file) => formData.append('media', file));
        setIsUploading(true);
        setUploadProgress(1);
        if (clearError) {
            setFailedUpload(null);
        }

        try {
            const uploadRes = await axios.post(`${API_URL}api/uploads/media-batch`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (event) => {
                    if (!event.total) return;
                    setUploadProgress(Math.round((event.loaded * 100) / event.total));
                },
            });
            const uploadedItems = uploadRes.data.mediaItems || [];
            if (uploadedItems.length === 0) {
                throw new Error('No uploaded file URL returned from server.');
            }
            return uploadedItems;
        } finally {
            setIsUploading(false);
        }
    };

    const emitMessage = (message, receiver = selectedUser) => {
        const roomName = createRoomName(currentUser?.id, receiver?._id);
        if (!roomName || !receiver?._id) return;

        socket.emit('send_message', {
            roomName,
            message: {
                senderId: currentUser.id,
                receiverId: receiver._id,
                ...message,
            },
        });

        if (receiver._id === selectedUser?._id) {
            socket.emit('stop_typing', { roomName, typingUser: currentUser.username });
        }

        // 💡 NEW: Update last message time for sorting
        if (setLastMessageTimes && receiver?._id) {
            setLastMessageTimes((prev) => ({
                ...prev,
                [receiver._id]: Date.now(),
            }));
        }
    };

    const handleSendMessage = async () => {
        if ((!input.trim() && selectedFiles.length === 0) || !currentUser?.id || !selectedUser?._id || isUploading) return;

        let mediaItems = [];
        if (selectedFiles.length > 0) {
            try {
                mediaItems = await uploadFiles(selectedFiles);
            } catch (err) {
                console.error('Error uploading file:', err);
                setFailedUpload({
                    files: selectedFiles,
                    caption: input.trim(),
                    type: selectedFiles.some((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) ? 'pdf' : 'file',
                    message: getUploadErrorMessage(err, 'File upload failed. Tap to retry.'),
                });
                return;
            }
        }

        emitMessage({
            text: input.trim() || null,
            filePath: mediaItems[0]?.filePath || null,
            fileType: mediaItems[0]?.fileType || null,
            mediaItems,
            mediaGroupId: mediaItems.length > 1 ? `gallery-${Date.now()}` : null,
            replyTo: replyingTo,
        });

        setInput('');
        setReplyingTo(null);
        clearSelectedFiles();
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    const startVoiceRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined' || isRecording) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
                        ? 'audio/ogg;codecs=opus'
                        : '';
            const recorder = new MediaRecorder(stream, preferredMimeType ? { mimeType: preferredMimeType } : undefined);
            recordingChunksRef.current = [];
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordingChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach((track) => track.stop());
                clearInterval(recordingTimerRef.current);
                setIsRecording(false);

                if (recordingCancelledRef.current) {
                    recordingCancelledRef.current = false;
                    recordingChunksRef.current = [];
                    setRecordingSeconds(0);
                    return;
                }

                const audioType = recorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(recordingChunksRef.current, { type: audioType });
                if (audioBlob.size === 0) return;

                const fileExtension = getAudioExtension(audioType);
                const voiceFile = new File([audioBlob], `voice-message-${Date.now()}.${fileExtension}`, { type: audioType });

                try {
                    const mediaItems = await uploadFiles([voiceFile]);
                    emitMessage({
                        text: null,
                        filePath: mediaItems[0]?.filePath || null,
                        fileType: mediaItems[0]?.fileType || 'audio/webm',
                        mediaItems,
                        mediaGroupId: null,
                        replyTo: replyingTo,
                    });
                    setReplyingTo(null);
                } catch (err) {
                    console.error('Error uploading voice message:', err);
                    setFailedUpload({
                        files: [voiceFile],
                        type: 'voice',
                        message: getUploadErrorMessage(err, 'Voice message upload failed. Tap to retry.'),
                    });
                } finally {
                    setRecordingSeconds(0);
                    setUploadProgress(0);
                }
            };

            recorder.start();
            recordingCancelledRef.current = false;
            setIsRecording(true);
            setRecordingSeconds(0);
            recordingTimerRef.current = setInterval(() => {
                setRecordingSeconds((prev) => prev + 1);
            }, 1000);
        } catch (err) {
            console.error('Microphone permission denied:', err);
            alert('Microphone permission is required to send a voice message.');
        }
    };

    const stopVoiceRecording = () => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const cancelVoiceRecording = () => {
        recordingCancelledRef.current = true;
        recordingChunksRef.current = [];
        stopVoiceRecording();
    };

    const retryFailedUpload = async () => {
        const filesToRetry = failedUpload?.files || (failedUpload?.file ? [failedUpload.file] : []);
        if (filesToRetry.length === 0) return;

        try {
            const mediaItems = await uploadFiles(filesToRetry, { clearError: false });
            emitMessage({
                text: failedUpload.caption || null,
                filePath: mediaItems[0]?.filePath || null,
                fileType: mediaItems[0]?.fileType || filesToRetry[0].type,
                mediaItems,
                mediaGroupId: mediaItems.length > 1 ? `gallery-${Date.now()}` : null,
                replyTo: replyingTo,
            });
            setFailedUpload(null);
            setUploadProgress(0);
            setInput('');
            setReplyingTo(null);
            clearSelectedFiles();
        } catch (err) {
            console.error('Retry upload failed:', err);
            setFailedUpload((prev) => prev ? { ...prev, message: getUploadErrorMessage(err, 'Retry failed. Tap to retry.') } : prev);
        }
    };

    const canEditMessage = (message, isOwnMessage) => {
        if (!isOwnMessage || !message._id || !getMessageText(message) || isMessageDeleted(message)) return false;
        const sentAt = getMessageDate(message);
        if (!sentAt) return true;
        return Date.now() - sentAt.getTime() <= 15 * 60 * 1000;
    };

    const startEditingMessage = (message) => {
        setEditingMessageId(message._id);
        setEditText(getMessageText(message));
        setOpenMessageMenuId(null);
    };

    const cancelEditingMessage = () => {
        setEditingMessageId(null);
        setEditText('');
    };

    const saveEditedMessage = () => {
        const newText = editText.trim();
        if (!editingMessageId || !newText || !currentUser?.id) return;

        socket.emit('edit-message', {
            messageId: editingMessageId,
            newText,
            userId: currentUser.id,
        });
    };

    const handleEditKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            saveEditedMessage();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            cancelEditingMessage();
        }
    };

    const handleClearChat = () => {
        if (window.confirm('Clear this chat from your screen?')) {
            setMessages([]);
            setActiveModal(null);
        }
    };

    const handleDeleteChat = async () => {
        const roomName = createRoomName();
        if (!roomName || !window.confirm('Delete this chat history permanently?')) return;

        try {
            await axios.delete(`${API_URL}api/chat/${roomName}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessages([]);
            setActiveModal(null);
        } catch (err) {
            console.error('Error deleting chat:', err);
            alert('Failed to delete chat history.');
        }
    };

    const handleCopyMessage = async (message) => {
        const textToCopy = getMessageText(message).trim();
        if (!textToCopy) return;

        try {
            if (!navigator.clipboard?.writeText) {
                throw new Error('Clipboard API is unavailable.');
            }

            await navigator.clipboard.writeText(textToCopy);
            showToast('Copied!');
            setOpenMessageMenuId(null);
        } catch (error) {
            console.error('Copy failed:', error);
            alert('Unable to copy this message.');
        }
    };

    const openDeleteModal = (message) => {
        setDeleteTarget(message);
        setActiveModal('delete-message');
        setOpenMessageMenuId(null);
    };

    const handleDeleteMessage = (messageId) => {
        const message = messages.find((item) => item._id === messageId);
        if (!message) return;
        openDeleteModal(message);
    };

    const confirmDeleteMessage = async (scope) => {
        if (!deleteTarget?._id || !currentUser?.id) return;

        if (scope === 'everyone') {
            socket.emit('message-delete-everyone', {
                messageId: deleteTarget._id,
                userId: currentUser.id,
            }, (response) => {
                if (!response?.ok) {
                    alert(response?.error || 'Failed to delete message for everyone.');
                    return;
                }

                setMessages((prev) => prev.map((message) => (
                    message._id === deleteTarget._id
                        ? {
                            ...message,
                            deletedForEveryone: true,
                            text: null,
                            filePath: null,
                            fileType: null,
                            mediaItems: [],
                            mediaGroupId: null,
                            replyTo: null,
                            forwardedFrom: null,
                        }
                        : message
                )));
                setSelectedMedia(null);
                setDeleteTarget(null);
                setActiveModal(null);
                showToast('Deleted for everyone');
            });
            return;
        }

        try {
            await axios.delete(`${API_URL}api/chat/message/${deleteTarget._id}?scope=me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setMessages((prev) => prev.filter((message) => message._id !== deleteTarget._id));
            setSelectedMedia((prev) => (prev?.messageId === deleteTarget._id ? null : prev));
            setDeleteTarget(null);
            setActiveModal(null);
            showToast('Deleted for you');
        } catch (error) {
            console.error('Delete message failed:', error);
            alert('Failed to delete message.');
        }
    };

    const handleToggleStar = async (message) => {
        if (!message?._id) return;

        try {
            const response = await axios.patch(`${API_URL}api/chat/message/${message._id}/star`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const starred = Boolean(response.data.starred);

            setMessages((prev) => prev.map((item) => {
                if (item._id !== message._id) return item;
                const existing = Array.isArray(item.starredBy) ? item.starredBy.map((userId) => userId?._id || userId) : [];
                const nextStarredBy = starred
                    ? [...new Set([...existing, currentUser.id])]
                    : existing.filter((userId) => userId !== currentUser.id);

                return { ...item, starredBy: nextStarredBy };
            }));

            showToast(starred ? 'Message starred' : 'Message unstarred');
            setOpenMessageMenuId(null);
        } catch (error) {
            console.error('Star toggle failed:', error);
            alert('Failed to update starred message.');
        }
    };

    const handleReplyToMessage = (message) => {
        setReplyingTo(buildReplyPayload(message));
        setOpenMessageMenuId(null);
    };

    const handleShowMessageInfo = (message) => {
        setMessageInfoTarget(message);
        setActiveModal('message-info');
        setOpenMessageMenuId(null);
    };

    const openMessageMenu = useCallback((messageId) => {
        if (!messageId) return;
        setOpenMessageMenuId(messageId);
    }, []);

    const isInteractiveMessageTarget = useCallback((target) => {
        if (!(target instanceof Element)) return false;
        return Boolean(target.closest('button, a, audio, video, input, textarea, .message-action-menu'));
    }, []);

    const handleMessageBubbleClick = useCallback((event, message) => {
        if (!message?._id || isInteractiveMessageTarget(event.target)) return;

        const selection = window.getSelection?.();
        if (selection && selection.toString().trim()) return;

        setOpenMessageMenuId((prev) => (prev === message._id ? null : message._id));
    }, [isInteractiveMessageTarget]);

    const handleMessageTouchStart = useCallback((event, message) => {
        if (!message?._id || isInteractiveMessageTarget(event.target)) return;

        clearLongPressTimer();
        longPressTimerRef.current = window.setTimeout(() => {
            openMessageMenu(message._id);
            longPressTimerRef.current = null;
        }, 450);
    }, [clearLongPressTimer, isInteractiveMessageTarget, openMessageMenu]);

    const activeMessageInfo = useMemo(() => {
        if (!messageInfoTarget?._id) return messageInfoTarget;
        return messages.find((item) => item._id === messageInfoTarget._id) || messageInfoTarget;
    }, [messageInfoTarget, messages]);

    const loadForwardContacts = async () => {
        if (!token) return;
        setIsLoadingForwardContacts(true);
        try {
            const response = await axios.get(`${API_URL}api/users/list`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setForwardContacts(response.data || []);
        } catch (error) {
            console.error('Failed to load contacts for forwarding:', error);
            alert('Could not load contacts.');
        } finally {
            setIsLoadingForwardContacts(false);
        }
    };

    const handleOpenForward = async (message) => {
        setForwardingMessage(message);
        setActiveModal('forward-message');
        setOpenMessageMenuId(null);
        await loadForwardContacts();
    };

    const handleForwardToContact = (contact) => {
        if (!forwardingMessage || !contact?._id) return;

        const mediaItems = getMessageMedia(forwardingMessage);
        emitMessage({
            text: getMessageText(forwardingMessage) || null,
            filePath: mediaItems[0]?.filePath || forwardingMessage.filePath || null,
            fileType: mediaItems[0]?.fileType || forwardingMessage.fileType || null,
            mediaItems,
            mediaGroupId: mediaItems.length > 1 ? `gallery-${Date.now()}` : null,
            forwardedFrom: buildForwardedFrom(forwardingMessage),
        }, contact);

        setForwardingMessage(null);
        setActiveModal(null);
        showToast(`Forwarded to ${contact.username}`);
    };

    const openMenuModal = (modalName) => {
        setActiveModal(modalName);
        setIsMenuOpen(false);
    };

    const moveSearch = (direction) => {
        if (searchMatches.length === 0) return;
        setActiveMatchIndex((prev) => (prev + direction + searchMatches.length) % searchMatches.length);
    };

    const formatRecordingTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const renderHighlightedText = (text, messageKey) => {
        if (!messageSearch.trim()) return text;

        const regex = new RegExp(`(${escapeRegExp(messageSearch.trim())})`, 'gi');
        return text.split(regex).map((part, index) => {
            const isMatch = part.toLowerCase() === messageSearch.trim().toLowerCase();
            if (!isMatch) return part;

            const isActiveMessage = searchMatches[activeMatchIndex]?.key === messageKey;
            return (
                <mark className={isActiveMessage ? 'message-highlight active' : 'message-highlight'} key={`${part}-${index}`}>
                    {part}
                </mark>
            );
        });
    };

    const renderProfileAvatar = () => {
        if (selectedUser?.profileImg) {
            return <img src={selectedUser.profileImg} alt={`${selectedUser.username} profile`} />;
        }

        return <span>{selectedUser?.username?.charAt(0).toUpperCase()}</span>;
    };

    const openMediaViewer = (items, index, message, isOwnMessage) => {
        setSelectedMedia({
            items,
            initialIndex: index,
            canDelete: isOwnMessage,
            messageId: message._id,
        });
    };

    const renderMediaGrid = (mediaItems, message, isOwnMessage) => {
        const images = mediaItems.filter((item) => isImage(item.fileType));
        const nonImages = mediaItems.filter((item) => !isImage(item.fileType));
        const visibleImages = images.slice(0, 4);

        return (
            <>
                {images.length > 0 && (
                    <div className={`image-gallery-grid gallery-count-${Math.min(images.length, 4)}`}>
                        {visibleImages.map((item, index) => (
                            <ImageThumb
                                key={`${item.filePath}-${index}`}
                                item={item}
                                index={index}
                                count={images.length}
                                onOpen={(imageIndex) => openMediaViewer(images, imageIndex, message, isOwnMessage)}
                            />
                        ))}
                    </div>
                )}

                {nonImages.map((item, index) => {
                    if (isVideo(item.fileType)) {
                        return (
                            <button
                                type="button"
                                className="video-preview"
                                key={`${item.filePath}-${index}`}
                                onClick={() => openMediaViewer([item], 0, message, isOwnMessage)}
                            >
                                <video src={item.filePath} preload="metadata" />
                                <span><i className="fas fa-play"></i></span>
                            </button>
                        );
                    }

                    if (isAudio(item.fileType)) {
                        return (
                            <div className="voice-message" key={`${item.filePath}-${index}`}>
                                <button type="button" className="voice-play-icon" aria-label="Voice message">
                                    <i className="fas fa-microphone"></i>
                                </button>
                                <audio src={item.filePath} controls preload="metadata" />
                            </div>
                        );
                    }

                    if (isPdf(item)) {
                        return (
                            <button
                                type="button"
                                className="pdf-preview-card"
                                key={`${item.filePath}-${index}`}
                                onClick={() => openMediaViewer([item], 0, message, isOwnMessage)}
                            >
                                <i className="fas fa-file-pdf"></i>
                                <span>{item.fileName || 'PDF document'}</span>
                                <small>Preview PDF</small>
                            </button>
                        );
                    }

                    return (
                        <a href={item.filePath} target="_blank" rel="noopener noreferrer" className="file-link" key={`${item.filePath}-${index}`}>
                            <i className="fas fa-file-alt"></i>
                            {item.fileName || 'Document'}
                        </a>
                    );
                })}
            </>
        );
    };

    const renderReadReceipt = (message, isOwnMessage) => {
        if (!isOwnMessage || isMessageDeleted(message)) return null;
        const status = message.status || 'sent';
        const label = status === 'seen' ? 'Seen' : status === 'delivered' ? 'Delivered' : 'Sent';
        return (
            <span className={`read-receipt ${status}`} aria-label={label} title={label}>
                {status === 'sent' ? '✓' : '✓✓'}
            </span>
        );
    };

    const renderReplyPreview = (replyTo) => {
        if (!replyTo) return null;

        return (
            <div className="reply-preview-block">
                <strong>{replyTo.senderName || 'Reply'}</strong>
                <span>{replyTo.text || replyTo.fileName || (replyTo.mediaCount ? `${replyTo.mediaCount} attachment${replyTo.mediaCount > 1 ? 's' : ''}` : 'Attachment')}</span>
            </div>
        );
    };

    const renderDeletedMessage = (message, isOwnMessage) => (
        <div className="deleted-message-text">
            <i className="fas fa-ban"></i>
            <span>{isOwnMessage ? 'You deleted this message' : 'This message was deleted'}</span>
        </div>
    );

    const renderMessage = (message, index) => {
        const senderId = message.senderId?._id || message.senderId;
        const isOwnMessage = senderId === currentUser.id;
        const messageKey = message._id || message.createdAt || message.timestamp || index;
        const text = getMessageText(message);
        const timestamp = message.createdAt || message.timestamp;
        const isCurrentMatch = searchMatches[activeMatchIndex]?.key === messageKey;
        const mediaItems = getMessageMedia(message);
        const isEditing = editingMessageId === message._id;
        const canEdit = canEditMessage(message, isOwnMessage);
        const isDeleted = isMessageDeleted(message);
        const isStarred = (message.starredBy || []).some((userId) => (userId?._id || userId) === currentUser.id);
        const hasContent = !isDeleted && (text || mediaItems.length > 0);

        return (
            <div
                key={messageKey}
                ref={(node) => {
                    messageRefs.current[messageKey] = node;
                }}
                className={`message-row ${isOwnMessage ? 'message-own' : 'message-other'} ${isCurrentMatch ? 'message-current-match' : ''}`}
                onDoubleClick={() => canEdit && startEditingMessage(message)}
                onContextMenu={(event) => {
                    event.preventDefault();
                    openMessageMenu(message._id);
                }}
            >
                <div
                    className={`message-bubble ${mediaItems.length > 0 && !text && !isDeleted ? 'media-only' : ''} ${isDeleted ? 'deleted' : ''}`}
                    onClick={(event) => handleMessageBubbleClick(event, message)}
                    onTouchStart={(event) => handleMessageTouchStart(event, message)}
                    onTouchEnd={clearLongPressTimer}
                    onTouchCancel={clearLongPressTimer}
                    onTouchMove={clearLongPressTimer}
                >
                    <div className={`message-actions ${openMessageMenuId === message._id ? 'visible' : ''}`}>
                        <button
                            type="button"
                            className="message-action-button"
                            aria-label="Message options"
                            onClick={() => setOpenMessageMenuId((prev) => prev === message._id ? null : message._id)}
                        >
                            <i className="fas fa-chevron-down"></i>
                        </button>
                        {openMessageMenuId === message._id && (
                            <div className="message-action-menu">
                                {text && !isDeleted && (
                                    <button type="button" onClick={() => handleCopyMessage(message)}>
                                        <i className="fas fa-copy"></i>
                                        Copy
                                    </button>
                                )}
                                {!isDeleted && (
                                    <button type="button" onClick={() => handleReplyToMessage(message)}>
                                        <i className="fas fa-reply"></i>
                                        Reply
                                    </button>
                                )}
                                {!isDeleted && (
                                    <button type="button" onClick={() => handleOpenForward(message)}>
                                        <i className="fas fa-share"></i>
                                        Forward
                                    </button>
                                )}
                                <button type="button" onClick={() => handleToggleStar(message)}>
                                    <i className={`fas ${isStarred ? 'fa-star' : 'fa-star-half-alt'}`}></i>
                                    {isStarred ? 'Unstar' : 'Star'}
                                </button>
                                {canEdit && (
                                    <button type="button" onClick={() => startEditingMessage(message)}>
                                        <i className="fas fa-pen"></i>
                                        Edit
                                    </button>
                                )}
                                <button type="button" onClick={() => handleShowMessageInfo(message)}>
                                    <i className="fas fa-info-circle"></i>
                                    Info
                                </button>
                                <button type="button" onClick={() => openDeleteModal(message)}>
                                    <i className="fas fa-trash-alt"></i>
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {message.forwardedFrom && !isDeleted && (
                        <div className="forwarded-label">
                            <i className="fas fa-share"></i>
                            Forwarded
                        </div>
                    )}

                    {isStarred && <i className="fas fa-star message-starred-icon" title="Starred"></i>}

                    {renderReplyPreview(message.replyTo)}

                    {isDeleted ? (
                        renderDeletedMessage(message, isOwnMessage)
                    ) : (
                        <>
                            {mediaItems.length > 0 && <div className="message-file">{renderMediaGrid(mediaItems, message, isOwnMessage)}</div>}
                            {isEditing ? (
                                <div className="message-edit-box">
                                    <textarea
                                        autoFocus
                                        value={editText}
                                        onChange={(event) => setEditText(event.target.value)}
                                        onKeyDown={handleEditKeyDown}
                                    />
                                    <div className="message-edit-actions">
                                        <button type="button" onClick={cancelEditingMessage}>Cancel</button>
                                        <button type="button" onClick={saveEditedMessage}>Save</button>
                                    </div>
                                </div>
                            ) : (
                                text && <div className="message-content">{renderHighlightedText(text, messageKey)}</div>
                            )}
                        </>
                    )}

                    <div className={`message-timestamp ${hasContent ? '' : 'deleted-timestamp'}`}>
                        {timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        {message.editedAt && !isDeleted && <span className="edited-label"> (edited)</span>}
                        {renderReadReceipt(message, isOwnMessage)}
                    </div>
                </div>
            </div>
        );
    };

    const renderMessagesWithDateHeaders = () => messages.map((message, index) => {
        const currentDate = getMessageDate(message);
        const previousDate = index > 0 ? getMessageDate(messages[index - 1]) : null;
        const shouldShowHeader = index === 0 || !isSameDay(currentDate, previousDate);

        return (
            <React.Fragment key={`group-${message._id || message.createdAt || message.timestamp || index}`}>
                {shouldShowHeader && (
                    <div className="message-date-header">
                        <span>{formatDateHeader(currentDate)}</span>
                    </div>
                )}
                {renderMessage(message, index)}
            </React.Fragment>
        );
    });

    if (!selectedUser) {
        return (
            <div className="chat-area-placeholder">
                <div className="placeholder-panel">
                    <i className="fab fa-whatsapp"></i>
                    <p>Select a user to start chatting</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-container">
            <div className="chat-header">
                <button className="header-icon-button mobile-back-button" type="button" aria-label="Back to chats" onClick={onBackToList}>
                    <i className="fas fa-arrow-left"></i>
                </button>
                <button className="chat-avatar-button" type="button" onClick={() => openMenuModal('contact')}>
                    <div className="chat-avatar">
                        {renderProfileAvatar()}
                        {isOnline && <span className="header-online-dot"></span>}
                    </div>
                </button>

                <button className="chat-user-info" type="button" onClick={() => openMenuModal('contact')}>
                    <h5>{selectedUser.username}</h5>
                    <small>{readableStatus}</small>
                </button>

                <div className="chat-header-actions">
                    <button className="header-icon-button" type="button" aria-label="Video call" onClick={() => handleCall('video')}>
                        <i className="fas fa-video"></i>
                    </button>
                    <button className="header-icon-button" type="button" aria-label="Audio call" onClick={() => handleCall('audio')}>
                        <i className="fas fa-phone"></i>
                    </button>
                    <button className="header-icon-button" type="button" aria-label="Search messages" onClick={() => setIsSearchOpen(true)}>
                        <i className="fas fa-search"></i>
                    </button>
                    <div className="header-menu-wrapper" ref={menuRef}>
                        <button className="header-icon-button" type="button" aria-label="More options" onClick={() => setIsMenuOpen((prev) => !prev)}>
                            <i className="fas fa-ellipsis-v"></i>
                        </button>
                        {isMenuOpen && (
                            <div className="whatsapp-menu">
                                <button type="button" onClick={() => openMenuModal('contact')}><i className="fas fa-id-card"></i> Contact Info</button>
                                <button type="button" onClick={() => openMenuModal('mute')}><i className="fas fa-bell-slash"></i> Mute Notifications</button>
                                <button type="button" onClick={() => openMenuModal('clear')}><i className="fas fa-eraser"></i> Clear Chat</button>
                                <button type="button" onClick={() => openMenuModal('delete')}><i className="fas fa-trash-alt"></i> Delete Chat</button>
                                <button type="button" onClick={() => openMenuModal('report')}><i className="fas fa-exclamation-triangle"></i> Report</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isSearchOpen && (
                <div className="message-search-bar">
                    <button className="header-icon-button" type="button" aria-label="Close search" onClick={() => {
                        setIsSearchOpen(false);
                        setMessageSearch('');
                    }}>
                        <i className="fas fa-times"></i>
                    </button>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Search messages"
                        value={messageSearch}
                        onChange={(event) => setMessageSearch(event.target.value)}
                    />
                    <span className="search-count">
                        {messageSearch.trim() ? `${searchMatches.length} messages found` : 'Search in conversation'}
                    </span>
                    <button className="header-icon-button" type="button" aria-label="Previous match" onClick={() => moveSearch(-1)} disabled={!searchMatches.length}>
                        <i className="fas fa-chevron-up"></i>
                    </button>
                    <button className="header-icon-button" type="button" aria-label="Next match" onClick={() => moveSearch(1)} disabled={!searchMatches.length}>
                        <i className="fas fa-chevron-down"></i>
                    </button>
                </div>
            )}

            <div className="chat-messages">
                {renderMessagesWithDateHeaders()}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                <div className="chat-ai-bar">
                    <button type="button" className="chat-ai-inline-btn" onClick={() => navigate('/ai-chat')}>
                        <i className="fas fa-robot"></i>
                        <span>Chat with AI</span>
                    </button>
                </div>

                {replyingTo && (
                    <div className="composer-context-bar">
                        <div>
                            <strong>Replying to {replyingTo.senderName}</strong>
                            <span>{replyingTo.text || replyingTo.fileName || 'Attachment'}</span>
                        </div>
                        <button type="button" onClick={() => setReplyingTo(null)}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}

                {selectedPreviews.length > 0 && (
                    <div className="file-preview media-preview-strip">
                        <div className="selected-media-stack">
                            {selectedPreviews.slice(0, 6).map((preview, index) => (
                                <div className="selected-media-preview" key={`${preview.file.name}-${index}`}>
                                    {preview.isImage && <img src={preview.url} alt={preview.file.name} />}
                                    {preview.isVideo && <video src={preview.url} />}
                                    {preview.isAudio && <i className="fas fa-microphone"></i>}
                                    {preview.isPdf && <i className="fas fa-file-pdf"></i>}
                                    {!preview.isImage && !preview.isVideo && !preview.isAudio && !preview.isPdf && <i className="fas fa-file-alt"></i>}
                                </div>
                            ))}
                        </div>
                        <div className="preview-file-meta">
                            <strong>{selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected</strong>
                            <span>{selectedFiles.map((file) => file.name).join(', ')}</span>
                            {isUploading && (
                                <div className="upload-progress">
                                    <span style={{ width: `${uploadProgress}%` }}></span>
                                </div>
                            )}
                        </div>
                        <button className="preview-remove-button" type="button" onClick={clearSelectedFiles}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}

                {isRecording && (
                    <div className="recording-bar">
                        <span className="recording-pulse"></span>
                        <strong>{formatRecordingTime(recordingSeconds)}</strong>
                        <div className="recording-wave"><span></span><span></span><span></span><span></span><span></span></div>
                        <button type="button" onClick={cancelVoiceRecording}>Cancel</button>
                        <button type="button" className="recording-send" onClick={stopVoiceRecording}>Send</button>
                    </div>
                )}

                {failedUpload && (
                    <button className="upload-error-bar" type="button" onClick={retryFailedUpload} disabled={isUploading}>
                        <i className="fas fa-exclamation-circle"></i>
                        <span>{failedUpload.message}</span>
                        {isUploading && (
                            <div className="upload-progress retry-progress">
                                <span style={{ width: `${uploadProgress}%` }}></span>
                            </div>
                        )}
                        <strong>{isUploading ? 'Retrying...' : 'Retry'}</strong>
                    </button>
                )}

                {isUploading && selectedPreviews.length === 0 && !failedUpload && (
                    <div className="voice-upload-progress">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <span>Uploading voice message...</span>
                        <div className="upload-progress retry-progress">
                            <span style={{ width: `${uploadProgress}%` }}></span>
                        </div>
                    </div>
                )}

                <div className="chat-input">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="visually-hidden"
                        multiple
                        accept="image/*,video/*,audio/*,.pdf"
                        onChange={handleFileSelect}
                    />
                    <button
                        className="compose-icon-button"
                        type="button"
                        aria-label="Add emoji"
                        onClick={() => setInput((prev) => `${prev}🙂`)}
                        disabled={isUploading || isRecording}
                    >
                        <i className="fas fa-smile"></i>
                    </button>
                    <button className="compose-icon-button" type="button" aria-label="Attach file" onClick={() => fileInputRef.current.click()} disabled={isUploading || isRecording}>
                        <i className="fas fa-paperclip"></i>
                    </button>
                    <input
                        type="text"
                        placeholder={selectedFiles.length ? 'Add a caption...' : replyingTo ? 'Type your reply' : 'Type a message'}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyPress}
                        disabled={isRecording}
                    />
                    <button className="send-button voice-button" type="button" aria-label="Record voice message" onClick={startVoiceRecording} disabled={isUploading || isRecording}>
                        <i className="fas fa-microphone"></i>
                    </button>
                    <button className="send-button" type="button" aria-label="Send message" onClick={handleSendMessage} disabled={isUploading || (!input.trim() && selectedFiles.length === 0)}>
                        <i className="fas fa-paper-plane"></i>
                    </button>
                </div>
            </div>

            {activeModal && (
                <div className="whatsapp-modal-backdrop" role="presentation" onMouseDown={() => {
                    setActiveModal(null);
                    setDeleteTarget(null);
                    setMessageInfoTarget(null);
                    setForwardingMessage(null);
                }}>
                    <div className="whatsapp-modal" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
                        {activeModal === 'contact' && (
                            <>
                                <h4>Contact Info</h4>
                                <div className="contact-modal-profile">
                                    <div className="chat-avatar large">{renderProfileAvatar()}</div>
                                    <h5>{selectedUser.username}</h5>
                                    <p>{readableStatus}</p>
                                </div>
                                <button type="button" className="modal-primary-button" onClick={() => navigate(`/user-detail/${selectedUser._id}`)}>View Profile</button>
                            </>
                        )}
                        {activeModal === 'mute' && (
                            <>
                                <h4>Mute Notifications</h4>
                                <button type="button" onClick={() => setActiveModal(null)}>8 hours</button>
                                <button type="button" onClick={() => setActiveModal(null)}>1 week</button>
                                <button type="button" onClick={() => setActiveModal(null)}>Always</button>
                            </>
                        )}
                        {activeModal === 'clear' && (
                            <>
                                <h4>Clear Chat</h4>
                                <p>This removes the messages from this screen until the conversation reloads.</p>
                                <button type="button" className="modal-danger-button" onClick={handleClearChat}>Clear Chat</button>
                            </>
                        )}
                        {activeModal === 'delete' && (
                            <>
                                <h4>Delete Chat</h4>
                                <p>This permanently deletes the chat history for this room.</p>
                                <button type="button" className="modal-danger-button" onClick={handleDeleteChat}>Delete Chat</button>
                            </>
                        )}
                        {activeModal === 'report' && (
                            <>
                                <h4>Report Contact</h4>
                                <textarea
                                    rows="4"
                                    placeholder="Tell us what happened"
                                    value={reportText}
                                    onChange={(event) => setReportText(event.target.value)}
                                />
                                <button
                                    type="button"
                                    className="modal-danger-button"
                                    onClick={() => {
                                        setReportText('');
                                        setActiveModal(null);
                                        alert('Report submitted.');
                                    }}
                                >
                                    Submit Report
                                </button>
                            </>
                        )}
                        {activeModal === 'delete-message' && deleteTarget && (
                            <>
                                <h4>Delete Message</h4>
                                <p>Choose how you want to delete this message.</p>
                                <div className="message-option-list">
                                    <button type="button" onClick={() => confirmDeleteMessage('me')}>Delete for me</button>
                                    {(deleteTarget.senderId?._id || deleteTarget.senderId) === currentUser.id && !isMessageDeleted(deleteTarget) && (
                                        <button type="button" className="modal-danger-button" onClick={() => confirmDeleteMessage('everyone')}>Delete for everyone</button>
                                    )}
                                </div>
                            </>
                        )}
                        {activeModal === 'message-info' && activeMessageInfo && (
                            <>
                                <h4>Message Info</h4>
                                <div className="message-info-panel">
                                    <p><strong>From:</strong> {getSenderName(activeMessageInfo)}</p>
                                    <p><strong>Sent:</strong> {formatTimestamp(activeMessageInfo.createdAt || activeMessageInfo.timestamp)}</p>
                                    <p><strong>Delivered:</strong> {formatTimestamp(activeMessageInfo.deliveredAt)}</p>
                                    <p><strong>Read:</strong> {formatTimestamp(activeMessageInfo.seenAt)}</p>
                                    <p><strong>Status:</strong> {isMessageDeleted(activeMessageInfo) ? 'Deleted for everyone' : (activeMessageInfo.status || 'sent')}</p>
                                    <p><strong>Starred:</strong> {(activeMessageInfo.starredBy || []).some((userId) => (userId?._id || userId) === currentUser.id) ? 'Yes' : 'No'}</p>
                                </div>
                            </>
                        )}
                        {activeModal === 'forward-message' && forwardingMessage && (
                            <>
                                <h4>Forward Message</h4>
                                <p>Select a contact to forward this message to.</p>
                                <div className="forward-preview-card">
                                    <strong>{buildForwardedFrom(forwardingMessage).senderName}</strong>
                                    <span>{summarizeMessage(forwardingMessage)}</span>
                                </div>
                                <div className="forward-contact-list">
                                    {isLoadingForwardContacts ? (
                                        <p>Loading contacts...</p>
                                    ) : (
                                        forwardContacts.map((contact) => (
                                            <button type="button" key={contact._id} onClick={() => handleForwardToContact(contact)}>
                                                <span>{contact.username}</span>
                                                <small>{contact.email}</small>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                        <button type="button" className="modal-close-button" onClick={() => {
                            setActiveModal(null);
                            setDeleteTarget(null);
                            setMessageInfoTarget(null);
                            setForwardingMessage(null);
                        }}>
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            )}

            {selectedMedia && (
                <MediaViewer
                    media={selectedMedia}
                    onClose={() => setSelectedMedia(null)}
                    onDelete={handleDeleteMessage}
                />
            )}

            {toast && (
                <div className="chat-toast" role="status" aria-live="polite">
                    {toast}
                </div>
            )}
        </div>
    );
};

export default ChatArea;
