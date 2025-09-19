// server/routes/authRoutes.js

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const dotenv = require('dotenv');

const { storage } = require('../config/cloudinaryConfig'); 
const upload = multer({ storage: storage });

dotenv.config();

// Register Route (Updated)
router.post('/register', upload.single('profileImg'), async (req, res) => {
    const { username, email, password } = req.body;
    // Cloudinary URL अब req.file.path में उपलब्ध है
    const profileImg = req.file ? req.file.path : null;

    try {
        let user = await User.findOne({ email });
        if (user) {
            // अगर user पहले से मौजूद है, तो Cloudinary से इमेज डिलीट करने की जरूरत नहीं
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({ username, email, password, profileImg });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        res.status(201).json({ msg: 'User registered successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login Route
router.post('/login', async (req, res) => {
    // यह route पहले से ही सही था, कोई बदलाव नहीं
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }
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
            { expiresIn: '7d' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;