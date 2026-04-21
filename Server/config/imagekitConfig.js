const dotenv = require('dotenv');
const ImageKit = require('imagekit');

dotenv.config();

const ensureNoProxy = (...hosts) => {
    const existing = (process.env.NO_PROXY || process.env.no_proxy || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const merged = Array.from(new Set([...existing, ...hosts]));
    const noProxyValue = merged.join(',');

    process.env.NO_PROXY = noProxyValue;
    process.env.no_proxy = noProxyValue;
};

ensureNoProxy('upload.imagekit.io', 'api.imagekit.io', 'ik.imagekit.io');

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

const getExtension = (fileName = '') => {
    const parts = fileName.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : '';
};

const isPdfFile = (file = {}) => (
    file.mimetype === 'application/pdf' ||
    getExtension(file.originalname || file.name || '') === 'pdf'
);

const isAudioFile = (file = {}) => {
    const mimeType = file.mimetype || file.type || '';
    return mimeType.startsWith('audio/') || ['webm', 'mp3', 'wav', 'ogg', 'm4a', 'opus'].includes(getExtension(file.originalname || file.name || ''));
};

const isVideoFile = (file = {}) => {
    const mimeType = file.mimetype || file.type || '';
    return mimeType.startsWith('video/');
};

const isImageFile = (file = {}) => {
    const mimeType = file.mimetype || file.type || '';
    return mimeType.startsWith('image/');
};

const sanitizeFileName = (fileName = 'file') => fileName.replace(/[^\w.-]/g, '_');

const getUploadFolder = (file, folderOverride) => {
    if (folderOverride) return folderOverride;
    if (isAudioFile(file)) return '/voice_messages';
    if (isPdfFile(file)) return '/documents';
    if (isVideoFile(file) || isImageFile(file)) return '/chat-app/shared-media';
    return '/chat-app/files';
};

const uploadBufferToImageKit = async (file, options = {}) => {
    if (!file?.buffer) {
        throw new Error('File buffer is required for ImageKit upload.');
    }

    const folder = getUploadFolder(file, options.folder);
    const fileName = sanitizeFileName(options.fileName || file.originalname || file.name || `upload-${Date.now()}`);

    const result = await imagekit.upload({
        file: file.buffer.toString('base64'),
        fileName,
        folder,
        useUniqueFileName: true,
        isPrivateFile: false,
    });

    return {
        filePath: result.url,
        fileType: file.mimetype || file.type || 'application/octet-stream',
        fileName,
        size: file.size || file.buffer.length,
        fileId: result.fileId,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl || null,
    };
};

const deleteImageKitFile = async (fileId) => {
    if (!fileId) return;
    await imagekit.deleteFile(fileId);
};

module.exports = {
    imagekit,
    uploadBufferToImageKit,
    deleteImageKitFile,
    isPdfFile,
    isAudioFile,
    isVideoFile,
    isImageFile,
};
