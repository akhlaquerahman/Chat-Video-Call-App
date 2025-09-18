// socket.js

const User = require('./models/User');
const Message = require('./models/Message');

const users = {}; // Mapping of identity to socket.id
const onlineUsers = new Set(); // Store online identities

function initializeSocket(io) {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Register identity
        socket.on('register_identity', async (identity) => {
            users[identity] = socket.id;
            onlineUsers.add(identity);
            console.log(`Identity '${identity}' registered with socket ID: ${socket.id}`);
            
            // Update lastSeen to null when user comes online
            await User.findOneAndUpdate({ username: identity }, { lastSeen: null });

            io.emit('online_users_list', Array.from(onlineUsers));
        });
        
        // Event to request a specific user's status
        socket.on('request_user_status', async ({ targetUser }) => {
            const isOnline = onlineUsers.has(targetUser);
            if (isOnline) {
                socket.emit('initial_status', { identity: targetUser, status: 'online' });
            } else {
                try {
                    const user = await User.findOne({ username: targetUser });
                    if (user && user.lastSeen) {
                        // 💡 UPDATED: Send the raw timestamp
                        socket.emit('initial_status', { identity: targetUser, status: 'last seen', timestamp: user.lastSeen });
                    } else {
                        socket.emit('initial_status', { identity: targetUser, status: 'offline' });
                    }
                } catch (error) {
                    console.error('Error fetching last seen status from DB:', error);
                    socket.emit('initial_status', { identity: targetUser, status: 'offline' });
                }
            }
        });

        socket.on('typing', ({ roomName, typingUser }) => {
            socket.to(roomName).emit('user_typing_update', { identity: typingUser, status: 'typing' });
        });

        socket.on('stop_typing', async ({ roomName, typingUser }) => {
            const isOnline = onlineUsers.has(typingUser);
            if (isOnline) {
                socket.to(roomName).emit('user_typing_update', { identity: typingUser, status: 'online' });
            } else {
                try {
                    const user = await User.findOne({ username: typingUser });
                    if (user && user.lastSeen) {
                        // 💡 UPDATED: Send the raw timestamp
                        socket.to(roomName).emit('user_typing_update', { identity: typingUser, status: 'last seen', timestamp: user.lastSeen });
                    } else {
                        socket.to(roomName).emit('user_typing_update', { identity: typingUser, status: 'offline' });
                    }
                } catch (error) {
                    console.error('Error fetching last seen status from DB:', error);
                    socket.to(roomName).emit('user_typing_update', { identity: typingUser, status: 'offline' });
                }
            }
        });

        socket.on('call_user', ({ userToCall, roomName, callerIdentity, callType }) => {
            const calleeSocketId = users[userToCall];
            if (calleeSocketId) {
                console.log(`Notifying ${userToCall} of incoming ${callType} call from ${callerIdentity}`);
                io.to(calleeSocketId).emit('incoming_call', { roomName, callerIdentity, callType });
            }
        });

        socket.on('join_chat_room', async (roomName) => {
            socket.join(roomName);
            console.log(`User ${socket.id} joined chat room: ${roomName}`);
            try {
                const messages = await Message.find({ roomName })
                    .populate('senderId', 'username profileImg')
                    .sort({ createdAt: 1 });
                socket.emit('receive_message_history', messages);
            } catch (error) {
                console.error('Error fetching message history:', error);
            }
        });

        socket.on('send_message', async ({ roomName, message }) => {
            try {
                const newMessage = new Message({
                    senderId: message.senderId,
                    receiverId: message.receiverId,
                    text: message.text || null,
                    filePath: message.filePath || null,
                    fileType: message.fileType || null,
                    roomName
                });
                await newMessage.save();
                const sender = await User.findById(message.senderId);
                const messageWithSenderName = {
                    ...newMessage.toObject(),
                    senderName: sender ? sender.username : 'Unknown'
                };
                io.to(roomName).emit('receive_message', messageWithSenderName);
            } catch (error) {
                console.error('Error saving or broadcasting message:', error);
            }
        });

        // Handle disconnect and broadcast status
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.id}`);
            for (const identity in users) {
                if (users[identity] === socket.id) {
                    delete users[identity];
                    onlineUsers.delete(identity);
                    
                    const lastSeenTime = new Date();
                    try {
                        await User.findOneAndUpdate(
                            { username: identity },
                            { lastSeen: lastSeenTime }
                        );
                        // 💡 UPDATED: Send the raw timestamp to frontend
                        io.emit('user_status_update', { identity, status: 'last seen', timestamp: lastSeenTime });
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