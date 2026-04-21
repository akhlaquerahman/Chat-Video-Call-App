const mongoose = require('mongoose');

const EmbeddedMediaSchema = new mongoose.Schema({
    filePath: {
        type: String,
        required: true,
    },
    fileType: {
        type: String,
        required: true,
    },
    fileName: {
        type: String,
        required: false,
    },
    size: {
        type: Number,
        required: false,
    },
}, { _id: false });

const MessageReferenceSchema = new mongoose.Schema({
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: false,
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    senderName: {
        type: String,
        required: false,
    },
    text: {
        type: String,
        required: false,
    },
    fileType: {
        type: String,
        required: false,
    },
    fileName: {
        type: String,
        required: false,
    },
    mediaCount: {
        type: Number,
        required: false,
    },
}, { _id: false });

const ForwardedFromSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    senderName: {
        type: String,
        required: false,
    },
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
        required: false,
    },
}, { _id: false });

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
        required: false,
    },
    fileType: {
        type: String,
        required: false,
    },
    mediaItems: [EmbeddedMediaSchema],
    mediaGroupId: {
        type: String,
        required: false,
    },
    replyTo: {
        type: MessageReferenceSchema,
        required: false,
    },
    forwardedFrom: {
        type: ForwardedFromSchema,
        required: false,
    },
    starredBy: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    deletedForEveryone: {
        type: Boolean,
        default: false,
    },
    deletedForEveryoneAt: {
        type: Date,
        required: false,
    },
    deletedForEveryoneBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false,
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'seen'],
        default: 'sent',
    },
    deliveredAt: {
        type: Date,
        required: false,
    },
    seenAt: {
        type: Date,
        required: false,
    },
    editedAt: {
        type: Date,
        required: false,
    },
    roomName: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Message', MessageSchema);
