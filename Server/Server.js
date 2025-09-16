// server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const twilio = require('twilio');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const initializeSocket = require('./socket'); 
const chatRoutes = require('./routes/chatRoutes');
const mediaRoutes = require('./routes/mediaRoutes'); // New import
const aiChatRoutes = require('./routes/aiChatRoutes');

const path = require('path'); 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "https://chat-video-call-app-six.vercel.app",
        methods: ["GET", "POST"]
    }
});

initializeSocket(io);

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(cors());

// 💡 NEW: Use the new AI Chat routes under a base path
app.use('/api/ai-chat', aiChatRoutes);





app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/uploads', mediaRoutes); // New: use the media routes


// Twilio token route
app.get('/twilio_token', (req, res) => {
    const { identity, roomName } = req.query;

    if (!identity || !roomName) {
        return res.status(400).send('Identity and Room Name are required.');
    }

    const accessToken = new twilio.jwt.AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY_SID,
        process.env.TWILIO_API_KEY_SECRET,
        { identity: identity }
    );

    const videoGrant = new twilio.jwt.AccessToken.VideoGrant({
        room: roomName
    });

    accessToken.addGrant(videoGrant);

    res.json({ token: accessToken.toJwt() });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});