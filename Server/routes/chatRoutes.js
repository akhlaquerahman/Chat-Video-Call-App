// server/routes/chatRoutes.js

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Message = require('../models/Message');

// 💡 NEW: Route to get all media shared with a specific user
router.get('/media/:otherUserId', authMiddleware, async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const currentUserId = req.user.id; // User ID from the authenticated token

        const mediaMessages = await Message.find({
            $and: [
                {
                    $or: [
                        { senderId: currentUserId, receiverId: otherUserId },
                        { senderId: otherUserId, receiverId: currentUserId }
                    ]
                },
                {
                    filePath: { $exists: true, $ne: null }
                }
            ]
        }).select('filePath fileType');

        res.json(mediaMessages);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Route to delete all messages in a room
router.delete('/:roomName', authMiddleware, async (req, res) => {
    try {
        const { roomName } = req.params;
        await Message.deleteMany({ roomName });
        res.json({ msg: 'Chat history deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;