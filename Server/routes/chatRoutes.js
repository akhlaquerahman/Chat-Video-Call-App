const express = require('express');

const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Message = require('../models/Message');

const canAccessMessage = (message, userId) => (
    message.senderId.toString() === userId || message.receiverId.toString() === userId
);

router.get('/starred', authMiddleware, async (req, res) => {
    try {
        const messages = await Message.find({
            starredBy: req.user.id
        })
        .populate('senderId', 'username profileImg')
        .populate('receiverId', 'username profileImg')
        .sort({ createdAt: -1 });

        return res.json(messages);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.get('/media/:otherUserId', authMiddleware, async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const currentUserId = req.user.id;

        const mediaMessages = await Message.find({
            $and: [
                {
                    $or: [
                        { senderId: currentUserId, receiverId: otherUserId },
                        { senderId: otherUserId, receiverId: currentUserId },
                    ],
                },
                {
                    $or: [
                        { filePath: { $exists: true, $ne: null } },
                        { mediaItems: { $exists: true, $ne: [] } },
                    ],
                },
                {
                    deletedFor: { $ne: currentUserId },
                },
            ],
        }).select('filePath fileType mediaItems deletedForEveryone');

        return res.json(mediaMessages);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.patch('/message/:messageId/star', authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }

        if (!canAccessMessage(message, req.user.id)) {
            return res.status(403).json({ msg: 'You cannot update this message' });
        }

        const alreadyStarred = message.starredBy.some((userId) => userId.toString() === req.user.id);
        if (alreadyStarred) {
            message.starredBy = message.starredBy.filter((userId) => userId.toString() !== req.user.id);
        } else {
            message.starredBy.push(req.user.id);
        }

        await message.save();
        return res.json({
            msg: alreadyStarred ? 'Message unstarred' : 'Message starred',
            starred: !alreadyStarred,
            messageId,
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.delete('/message/:messageId', authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;
        const scope = req.query.scope || 'me';
        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ msg: 'Message not found' });
        }

        if (!canAccessMessage(message, req.user.id)) {
            return res.status(403).json({ msg: 'You cannot delete this message' });
        }

        if (scope === 'everyone') {
            if (message.senderId.toString() !== req.user.id) {
                return res.status(403).json({ msg: 'Only the sender can delete for everyone' });
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
            message.deletedForEveryoneBy = req.user.id;
            await message.save();

            return res.json({
                msg: 'Message deleted for everyone',
                scope,
                messageId,
                deletedAt: message.deletedForEveryoneAt,
            });
        }

        if (!message.deletedFor.some((userId) => userId.toString() === req.user.id)) {
            message.deletedFor.push(req.user.id);
            await message.save();
        }

        return res.json({
            msg: 'Message deleted for you',
            scope: 'me',
            messageId,
        });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.delete('/:roomName', authMiddleware, async (req, res) => {
    try {
        const { roomName } = req.params;
        await Message.deleteMany({ roomName });
        return res.json({ msg: 'Chat history deleted successfully' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

module.exports = router;
