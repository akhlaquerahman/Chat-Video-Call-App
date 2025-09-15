// server/routes/userRoutes.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { storage, cloudinary } = require('../config/cloudinaryConfig');
const upload = multer({ storage: storage });

const authMiddleware = (req, res, next) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// Route to get all users
router.get('/list', authMiddleware, async (req, res) => {
    try {
        const users = await User.find({ _id: { $ne: req.user.id } }).select('-password -__v');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Route to search for users by username
router.get('/search', authMiddleware, async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ msg: 'Query parameter is required' });
        }
        
        const users = await User.find({ 
            username: { $regex: query, $options: 'i' },
            _id: { $ne: req.user.id }
        }).select('-password -__v');

        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Corrected: Updated route to handle profile picture upload and other details
router.put('/:id', authMiddleware, upload.single('profileImg'), async (req, res) => {
    try {
        const { username, email, removeProfilePic } = req.body;
        const newProfileImgPath = req.file ? req.file.path : null;
        const user = await User.findById(req.params.id);

        if (!user) {
            if (req.file) {
                // If the user is not found, delete the newly uploaded image from Cloudinary
                const publicId = req.file.filename;
                await cloudinary.uploader.destroy(publicId);
            }
            return res.status(404).json({ msg: 'User not found' });
        }

        if (username) {
            user.username = username;
        }
        if (email) {
            user.email = email;
        }

        if (newProfileImgPath) {
            if (user.profileImg) {
                // OLD URL से Public ID निकालें और पुरानी इमेज डिलीट करें
                const publicId = user.profileImg.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`chat-app/profiles/${publicId}`);
            }
            user.profileImg = newProfileImgPath;
        } else if (removeProfilePic === 'true') {
            if (user.profileImg) {
                // Public ID निकालें और पुरानी इमेज डिलीट करें
                const publicId = user.profileImg.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(`chat-app/profiles/${publicId}`);
            }
            user.profileImg = null;
        }

        await user.save();

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                profileImg: user.profileImg,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, newToken) => {
                if (err) throw err;
                res.json({ token: newToken, user: payload.user });
            }
        );
        
    } catch (err) {
        console.error('Error in profile update:', err);
        res.status(500).send('Server error');
    }
});

// Route to get a single user's details by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Route to get last seen status for a user
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
        res.json({ lastSeen: user.lastSeen });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;