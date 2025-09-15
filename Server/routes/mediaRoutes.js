// server/routes/mediaRoutes.js

const express = require('express');
const multer = require('multer');
const router = express.Router();

const { storage } = require('../config/cloudinaryConfig');
const upload = multer({ storage: storage });

router.post('/media', upload.single('media'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    // Cloudinary URL अब req.file.path से मिल रहा है
    res.json({ filePath: req.file.path, fileType: req.file.mimetype });
});

module.exports = router;