const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { uploadBufferToImageKit } = require('../config/imagekitConfig');
const { sendOTP } = require('../utils/email');

dotenv.config();
const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to generate JWT
const generateToken = (user) => {
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
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
};

router.post('/register', upload.single('profileImg'), async (req, res) => {
    const { username, email, password, phoneNumber } = req.body;

    try {
        let user = await User.findOne({ email });
        // If user exists and is verified
        if (user && user.isVerified) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        if (user) {
            // Update existing unverified user
            user.username = username;
            user.phoneNumber = phoneNumber;
            user.otp = otp;
            user.otpExpires = otpExpires;
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        } else {
            // Create new user
            let profileImg = null;
            let profileImgFileId = null;

            if (req.file) {
                const uploadedProfile = await uploadBufferToImageKit(req.file, { folder: '/chat-app/profiles' });
                profileImg = uploadedProfile.filePath;
                profileImgFileId = uploadedProfile.fileId;
            }

            user = new User({ 
                username, 
                email, 
                password, 
                phoneNumber, 
                profileImg, 
                profileImgFileId,
                otp,
                otpExpires,
                lastSeen: new Date()
            });

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        await sendOTP(email, otp);

        return res.status(200).json({ msg: 'OTP sent to your email. Please verify to complete registration.' });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        const token = generateToken(user);
        return res.json({ token, user: { id: user.id, username: user.username, email: user.email, profileImg: user.profileImg } });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ msg: 'Please verify your email to login' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const token = generateToken(user);
        res.json({ token });
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server error');
    }
});

router.post('/google-login', async (req, res) => {
    const { tokenId } = req.body;

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: tokenId,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const { name, email, picture } = ticket.getPayload();

        let user = await User.findOne({ email });

        if (!user) {
            // Create a new user for Google login
            user = new User({
                username: name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
                email,
                password: await bcrypt.hash(Math.random().toString(36), 10),
                profileImg: picture,
                isVerified: true, // Google emails are pre-verified
                lastSeen: new Date()
            });
            await user.save();
        } else if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
        }

        const token = generateToken(user);
        res.json({ token });
    } catch (err) {
        console.error('Google Login Error:', err);
        res.status(400).json({ msg: 'Google login failed' });
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User with this email does not exist' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await user.save();

        await sendOTP(email, otp);
        res.json({ msg: 'OTP sent to your email' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.otp !== otp || user.otpExpires < Date.now()) {
            return res.status(400).json({ msg: 'Invalid or expired OTP' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        res.json({ msg: 'Password reset successful' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
