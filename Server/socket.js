const User = require('./models/User');
const Message = require('./models/Message');

const users = {};
const onlineUsers = new Set();

const getLastSeenStatus = async (username) => {
    if (onlineUsers.has(username)) {
        return 'online';
    }

    try {
        const user = await User.findOne({ username });
        if (user && user.lastSeen) {
            return `last seen ${new Date(user.lastSeen).toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error fetching last seen status from DB:', error);
    }

    return 'offline';
};

const sanitizeReplyTo = (replyTo) => {
    if (!replyTo || typeof replyTo !== 'object') return null;

    return {
        messageId: replyTo.messageId || null,
        senderId: replyTo.senderId || null,
        senderName: replyTo.senderName || null,
        text: replyTo.text || null,
        fileType: replyTo.fileType || null,
        fileName: replyTo.fileName || null,
        mediaCount: replyTo.mediaCount || 0,
    };
};

const sanitizeForwardedFrom = (forwardedFrom) => {
    if (!forwardedFrom || typeof forwardedFrom !== 'object') return null;

    return {
        senderId: forwardedFrom.senderId || null,
        senderName: forwardedFrom.senderName || null,
        messageId: forwardedFrom.messageId || null,
    };
};

const buildHistoryQuery = (roomName, userId) => {
    const query = { roomName };
    if (userId) {
        query.deletedFor = { $ne: userId };
    }
    return query;
};

function initializeSocket(io) {
    io.on('connection', (socket) => {

        socket.on('register_identity', async (identity) => {
            users[identity] = socket.id;
            onlineUsers.add(identity);

            // Join a private room for this user to receive direct notifications
            socket.join(`notify-${identity}`);

            io.emit('online_users_list', Array.from(onlineUsers));
        });

        socket.on('request_user_status', async ({ targetUser }) => {
            const status = await getLastSeenStatus(targetUser);
            socket.emit('initial_status', { identity: targetUser, status });
        });

        socket.on('typing', ({ roomName, typingUser }) => {
            socket.to(roomName).emit('user_typing_update', { identity: typingUser, status: 'typing' });
        });

        socket.on('stop_typing', async ({ roomName, typingUser }) => {
            const status = await getLastSeenStatus(typingUser);
            socket.to(roomName).emit('user_typing_update', { identity: typingUser, status });
        });

        socket.on('call_user', ({ userToCall, roomName, callerIdentity, callType }) => {
            const calleeSocketId = users[userToCall];
            if (calleeSocketId) {
                io.to(calleeSocketId).emit('incoming_call', { roomName, callerIdentity, callType });
            }
        });

        socket.on('join_chat_room', async (payload) => {
            const roomName = typeof payload === 'string' ? payload : payload?.roomName;
            const userId = typeof payload === 'object' ? payload?.userId : null;

            if (!roomName) return;

            socket.join(roomName);

            try {
                const messages = await Message.find(buildHistoryQuery(roomName, userId))
                    .populate('senderId', 'username profileImg')
                    .sort({ createdAt: 1 });
                socket.emit('receive_message_history', messages);
            } catch (error) {
                console.error('Error fetching message history:', error);
            }
        });

        socket.on('send_message', async ({ roomName, message }) => {
            try {
                const receiver = await User.findById(message.receiverId);
                const receiverIsOnline = receiver ? onlineUsers.has(receiver.username) : false;

                const newMessage = new Message({
                    senderId: message.senderId,
                    receiverId: message.receiverId,
                    text: message.text || null,
                    filePath: message.filePath || null,
                    fileType: message.fileType || null,
                    mediaItems: message.mediaItems || [],
                    mediaGroupId: message.mediaGroupId || null,
                    replyTo: sanitizeReplyTo(message.replyTo),
                    forwardedFrom: sanitizeForwardedFrom(message.forwardedFrom),
                    status: receiverIsOnline ? 'delivered' : 'sent',
                    deliveredAt: receiverIsOnline ? new Date() : null,
                    roomName,
                });

                await newMessage.save();

                const fullMessage = await Message.findById(newMessage._id).populate('senderId', 'username profileImg');
                io.to(roomName).emit('receive_message', fullMessage);
                
                // Also send to receiver's private notification room
                if (receiver) {
                    io.to(`notify-${receiver.username}`).emit('receive_notification', fullMessage);
                }
            } catch (error) {
                console.error('Error saving or broadcasting message:', error);
            }
        });

        socket.on('message-read', async ({ messageId, userId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message || message.receiverId.toString() !== userId || message.deletedForEveryone) return;

                message.status = 'seen';
                message.seenAt = new Date();
                if (!message.deliveredAt) {
                    message.deliveredAt = message.seenAt;
                }
                await message.save();

                io.to(message.roomName).emit('message-seen', {
                    messageId,
                    userId,
                    status: 'seen',
                    seenAt: message.seenAt,
                    deliveredAt: message.deliveredAt,
                });
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        });

        socket.on('edit-message', async ({ messageId, newText, userId }) => {
            try {
                const message = await Message.findById(messageId);
                if (!message || message.senderId.toString() !== userId || message.deletedForEveryone) return;

                const sentAt = message.createdAt ? new Date(message.createdAt).getTime() : Date.now();
                const fifteenMinutes = 15 * 60 * 1000;
                if (Date.now() - sentAt > fifteenMinutes) {
                    socket.emit('edit-message-error', {
                        messageId,
                        error: 'Messages can only be edited within 15 minutes.',
                    });
                    return;
                }

                message.text = newText;
                message.editedAt = new Date();
                await message.save();

                io.to(message.roomName).emit('message-edited', {
                    messageId,
                    newText,
                    editedAt: message.editedAt,
                });
            } catch (error) {
                console.error('Error editing message:', error);
                socket.emit('edit-message-error', {
                    messageId,
                    error: 'Failed to edit message.',
                });
            }
        });

        socket.on('message-delete-everyone', async ({ messageId, userId }, callback) => {
            try {
                const message = await Message.findById(messageId);
                if (!message) {
                    callback?.({ ok: false, error: 'Message not found.' });
                    return;
                }

                if (message.senderId.toString() !== userId) {
                    callback?.({ ok: false, error: 'Only the sender can delete for everyone.' });
                    return;
                }

                message.text = null;
                message.filePath = null;
                message.fileType = null;
                message.mediaItems = [];
                message.mediaGroupId = null;
                message.replyTo = null;
                message.forwardedFrom = null;
                message.deletedForEveryone = true;
                message.deletedForEveryoneAt = new Date();
                message.deletedForEveryoneBy = userId;
                await message.save();

                io.to(message.roomName).emit('message-deleted', {
                    messageId,
                    scope: 'everyone',
                    deletedAt: message.deletedForEveryoneAt,
                });

                callback?.({ ok: true });
            } catch (error) {
                console.error('Error deleting message for everyone:', error);
                callback?.({ ok: false, error: 'Failed to delete message for everyone.' });
            }
        });

        socket.on('disconnect', async () => {
            for (const identity in users) {
                if (users[identity] === socket.id) {
                    delete users[identity];
                    onlineUsers.delete(identity);

                    const lastSeenTime = new Date();
                    try {
                        await User.findOneAndUpdate({ username: identity }, { lastSeen: lastSeenTime });
                        io.emit('user_status_update', { identity, status: `last seen ${lastSeenTime.toLocaleString()}` });
                    } catch (error) {
                        console.error('Error updating last seen status:', error);
                        io.emit('user_status_update', { identity, status: 'offline' });
                    }

                    io.emit('online_users_list', Array.from(onlineUsers));
                    break;
                }
            }
        });
    });
}

module.exports = initializeSocket;
