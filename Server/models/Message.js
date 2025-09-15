// server/models/Message.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: false,
  },
  filePath: {
    type: String,
    required: false, // New field to store file path
  },
  fileType: {
    type: String,
    required: false, // To differentiate between photo, video, document
  },
  roomName: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Message', MessageSchema);