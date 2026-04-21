const express = require('express');
const multer = require('multer');

const {
    uploadBufferToImageKit,
    isAudioFile,
    isPdfFile,
} = require('../config/imagekitConfig');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 25 * 1024 * 1024,
        files: 10,
    },
});

const normalizeUploadedItem = (file, uploadResult) => ({
    filePath: uploadResult.filePath,
    fileType: uploadResult.fileType,
    fileName: uploadResult.fileName || file.originalname,
    size: uploadResult.size || file.size,
    fileId: uploadResult.fileId,
});

const uploadToImageKit = async (file) => {
    const folder = isAudioFile(file)
        ? '/voice_messages'
        : isPdfFile(file)
            ? '/documents'
            : '/chat-app/shared-media';

    const uploadedFile = await uploadBufferToImageKit(file, { folder });
    return normalizeUploadedItem(file, uploadedFile);
};

router.get('/health', (req, res) => {
    res.json({ ok: true, route: '/api/uploads' });
});

router.post('/media', upload.single('media'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    try {
        const mediaItem = await uploadToImageKit(req.file);
        return res.json(mediaItem);
    } catch (error) {
        console.error('ImageKit media upload failed:', {
            message: error.message,
            help: error.help,
        });
        return res.status(500).json({ error: error.message || 'Media upload failed. Please retry.' });
    }
});

router.post('/media-batch', upload.array('media', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded.' });
    }

    try {
        const mediaItems = await Promise.all(req.files.map(uploadToImageKit));
        return res.json({ mediaItems });
    } catch (error) {
        console.error('ImageKit batch upload failed:', {
            message: error.message,
            help: error.help,
        });
        return res.status(500).json({ error: error.message || 'File upload failed. Tap to retry.' });
    }
});

module.exports = router;
