const dns = require('dns');
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
const mediaRoutes = require('./routes/mediaRoutes');
const aiChatRoutes = require('./routes/aiChatRoutes');

dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://chat-video-call-app-six.vercel.app',
    process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
};

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

initializeSocket(io);

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch((err) => console.error('MongoDB connection error:', err));

app.use(express.json());
app.use(cors(corsOptions));

app.use('/api/ai-chat', aiChatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/uploads', mediaRoutes);

app.get('/twilio_token', (req, res) => {
    const { identity, roomName } = req.query;

    if (!identity || !roomName) {
        return res.status(400).send('Identity and Room Name are required.');
    }

    const accessToken = new twilio.jwt.AccessToken(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_API_KEY_SID,
        process.env.TWILIO_API_KEY_SECRET,
        { identity }
    );

    const videoGrant = new twilio.jwt.AccessToken.VideoGrant({ room: roomName });
    accessToken.addGrant(videoGrant);

    return res.json({ token: accessToken.toJwt() });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
