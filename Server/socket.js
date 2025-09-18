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
            
            // 💡 NEW: Update lastSeen to null when user comes online
            await User.findOneAndUpdate({ username: identity }, { lastSeen: null });

            // 💡 UPDATED: Broadcast the updated list of online users to everyone
            io.emit('online_users_list', Array.from(onlineUsers));

        });
        
        // 💡 NEW: Event to request a specific user's status (we need this for last seen)
        socket.on('request_user_status', async ({ targetUser }) => {
            const isOnline = onlineUsers.has(targetUser);
            let status;
            
            if (isOnline) {
                status = 'online';
            } else {
                try {
                    const user = await User.findOne({ username: targetUser });
                    if (user && user.lastSeen) {
                        status = `last seen ${new Date(user.lastSeen).toLocaleString()}`;
                    } else {
                        status = 'offline';
                    }
                } catch (error) {
                    console.error('Error fetching last seen status from DB:', error);
                    status = 'offline';
                }
            }
            socket.emit('initial_status', { identity: targetUser, status });
        });

        // ... (other socket events like typing, stop_typing, call_user) ...
        socket.on('typing', ({ roomName, typingUser }) => {
            socket.to(roomName).emit('user_typing_update', { identity: typingUser, status: 'typing' });
        });

        socket.on('stop_typing', async ({ roomName, typingUser }) => {
            const isOnline = onlineUsers.has(typingUser);
            let status;
            if (isOnline) {
                status = 'online';
            } else {
                try {
                    const user = await User.findOne({ username: typingUser });
                    if (user && user.lastSeen) {
                        status = `last seen ${new Date(user.lastSeen).toLocaleString()}`;
                    } else {
                        status = 'offline';
                    }
                } catch (error) {
                    console.error('Error fetching last seen status from DB:', error);
                    status = 'offline';
                }
            }
            socket.to(roomName).emit('user_typing_update', { identity: typingUser, status: status });
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
                        io.emit('user_status_update', { identity, status: `last seen ${lastSeenTime.toLocaleString()}` });
                    } catch (error) {
                        console.error('Error updating last seen status:', error);
                        io.emit('user_status_update', { identity, status: 'offline' });
                    }
                    
                    // 💡 UPDATED: Broadcast the new list of online users after disconnect
                    io.emit('online_users_list', Array.from(onlineUsers));
                    
                    break;
                }
            }
        });
    });
}

module.exports = initializeSocket;