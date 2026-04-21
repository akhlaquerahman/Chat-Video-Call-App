const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');
const { uploadBufferToImageKit, deleteImageKitFile } = require('../config/imagekitConfig');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/list', authMiddleware, async (req, res) => {
    try {
        const currentUserId = new mongoose.Types.ObjectId(req.user.id);
        
        // Find all users except current
        const users = await User.find({ _id: { $ne: currentUserId } }).select('-password -__v');

        // Aggregate last message timestamps for each user
        const lastMessages = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: currentUserId },
                        { receiverId: currentUserId }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$senderId", currentUserId] },
                            "$receiverId",
                            "$senderId"
                        ]
                    },
                    lastMessageAt: { $first: "$createdAt" }
                }
            }
        ]);

        // Convert aggregation result to a map for easy lookup
        const lastMessageMap = {};
        lastMessages.forEach(msg => {
            lastMessageMap[msg._id.toString()] = msg.lastMessageAt;
        });

        // Attach lastMessageAt to each user
        const usersWithLastMsg = users.map(user => {
            const userObj = user.toObject();
            userObj.lastMessageAt = lastMessageMap[user._id.toString()] || null;
            return userObj;
        });

        return res.json(usersWithLastMsg);
    } catch (err) {
        console.error('Error fetching users with last message:', err);
        return res.status(500).send('Server error');
    }
});

router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ msg: 'Query parameter is required' });
        }

        const users = await User.find({
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.user.id },
        }).select('-password -__v');

        return res.json(users);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.put('/:id', authMiddleware, upload.single('profileImg'), async (req, res) => {
    try {
        const { username, email, phoneNumber, about, removeProfilePic } = req.body;
        
        // Security check: Only allow users to update their own profile
        if (req.user.id !== req.params.id) {
            return res.status(403).json({ msg: 'Authorization denied' });
        }

        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Check if username/email is taken by another user
        if (username && username !== user.username) {
            const existingUser = await User.findOne({ username });
            if (existingUser) {
                return res.status(400).json({ msg: 'Username is already taken' });
            }
            user.username = username;
        }
        if (email && email !== user.email) {
            const existingEmail = await User.findOne({ email });
            if (existingEmail) {
                return res.status(400).json({ msg: 'Email is already taken' });
            }
            user.email = email;
        }
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (about) user.about = about;

        if (req.file) {
            const uploadedProfile = await uploadBufferToImageKit(req.file, { folder: '/chat-app/profiles' });

            if (user.profileImgFileId) {
                await deleteImageKitFile(user.profileImgFileId).catch((error) => {
                    console.error('Failed to delete old ImageKit profile image:', error.message);
                });
            }

            user.profileImg = uploadedProfile.filePath;
            user.profileImgFileId = uploadedProfile.fileId;
        } else if (removeProfilePic === 'true') {
            if (user.profileImgFileId) {
                await deleteImageKitFile(user.profileImgFileId).catch((error) => {
                    console.error('Failed to delete ImageKit profile image:', error.message);
                });
            }

            user.profileImg = null;
            user.profileImgFileId = null;
        }

        await user.save();

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                about: user.about,
                profileImg: user.profileImg,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' },
            (err, newToken) => {
                if (err) throw err;
                res.json({ token: newToken, user: payload.user });
            }
        );
    } catch (err) {
        console.error('Error in profile update:', err);
        return res.status(500).send('Server error');
    }
});

router.get('/get-last-seen', authMiddleware, async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ msg: 'Username is required' });
        }
        const user = await User.findOne({ username }).select('lastSeen');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        return res.json({ lastSeen: user.lastSeen });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        return res.json(user);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.post('/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Incorrect current password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ msg: 'Password changed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
