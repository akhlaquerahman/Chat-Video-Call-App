// server/config/cloudinaryConfig.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');

dotenv.config();

// Cloudinary को configure करें
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage engine configure करें
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder;
    // URL के अनुसार folder सेट करें
    if (req.originalUrl.includes('/api/auth/register') || req.originalUrl.includes('/api/users')) {
      folder = 'chat-app/profiles';
    } else if (req.originalUrl.includes('/api/uploads/media')) {
      folder = 'chat-app/shared-media';
    } else {
      folder = 'chat-app/miscellaneous';
    }

    // फ़ाइल टाइप के अनुसार resource_type सेट करें
    const resource_type = file.mimetype.startsWith('image') ? 'image' : 'auto';

    return {
      folder: folder,
      allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'mp4', 'pdf'],
      resource_type: resource_type,
    };
  },
});

module.exports = { cloudinary, storage };