// server/models/AIChatMessage.js

const mongoose = require('mongoose');

const AIChatMessageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User' // Assuming your user model is named 'User'
    },
    role: {
        type: String,
        required: true,
        enum: ['user', 'assistant']
    },
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const AIChatMessage = mongoose.model('AIChatMessage', AIChatMessageSchema);

module.exports = AIChatMessage;