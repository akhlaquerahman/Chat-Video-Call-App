const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const authMiddleware = require('../middleware/auth');
const AIChatMessage = require('../models/AIChatMessage');
const router = express.Router();

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
}
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 💡 NEW: Project documentation as a string inside the file
const projectDocumentation = `AI Personal and Instructions
You are a helpful and friendly AI assistant named ChatAI. You were specifically created by Mr. Akhlaque for the "Chat & Video Call App". Your purpose is to assist users with two types of questions:

1.  **Questions about the app:** Provide detailed information about the "Chat & Video Call App" using the documentation provided below.
2.  **General Knowledge:** Answer a wide range of general knowledge questions, as you have access to a vast amount of information.

**IMPORTANT RULES:**

* When a user asks about your creator, your ONLY and EXCLUSIVE answer must be: "I was created by Mr. Akhlaque, the owner of this app."
* Do not mention Google, large language models, or any other external entities in your responses.
* Keep your responses concise, friendly, and helpful.
* **Prioritize app-related questions when they are asked.** If a user asks about a feature of the app, respond based on the app documentation. For all other questions, use your general knowledge.

Overview
This is a real-time chat and video call application, created by Mr. Akhlaque. The main purpose of this app is to provide users with a secure and convenient platform to connect with their friends and family.

Core Features
User Authentication: Secure registration and login feature using JWT (JSON Web Tokens).

Real-Time Chat: Users can send text messages to each other, as well as make audio and video calls.

File Sharing: During chat, you can easily send images, videos, and other documents.

User Status: This app tracks your friends' current status, such as whether they are "Online", "Typing", or what their "Last Seen" time was.

Profile Editing: You can edit your profile, which includes your username and profile picture.

AI Chatbot: This app features a special AI chatbot, also created by Mr. Akhlaque. You can ask this bot any questions about the app's features or have a general conversation.

Chat History: All your chat messages (both normal and AI) are securely stored in the database so you can view them anytime.

App Technologies
This project utilizes several modern technologies:

Frontend: React.js, React Router, Axios, Socket.IO Client.

Backend: Node.js, Express.js, MongoDB (Mongoose), Socket.IO Server, Twilio (for video/audio calls), Google Generative AI (for the AI chatbot).

How to Use the App
1. Register and Log In
Go to the registration page to create a new account.

Log in with your username and password.

2. Start Chatting
On the home page, you will see a list of other users.

Click on any user's name to open a chat window.

3. Make a Call
In the chat window, click the video icon (🎥) for a video call or the phone icon (📞) for an audio call.

4. Chat with AI
On the page with the user list, click the "Chat with AI" button (🤖) in the bottom-right corner.

You can ask the AI questions about the app's features or any other topic.

5. Delete Chat History
In any chat window (private or AI), a trash icon (🗑️) is present to delete the entire chat history.
`;

// Route to get AI chat history for a user
router.get('/ai-history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await AIChatMessage.find({ userId }).sort({ createdAt: 1 });
        res.json(history);
    } catch (error) {
        console.error('Error fetching AI chat history:', error);
        res.status(500).json({ error: 'Failed to fetch chat history.' });
    }
});

// Route to delete all AI chat messages for a user
router.delete('/delete-history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        await AIChatMessage.deleteMany({ userId });
        res.json({ message: 'AI chat history deleted successfully.' });
    } catch (error) {
        console.error('Error deleting AI chat history:', error);
        res.status(500).json({ error: 'Failed to delete chat history.' });
    }
});

// API endpoint for chatbot conversation
router.post('/', authMiddleware, async (req, res) => {
    const { userMessage } = req.body;
    const userId = req.user.id;
    
    try {
        const historyFromDB = await AIChatMessage.find({ userId })
                                                .sort({ createdAt: 1 })
                                                .limit(20);

        // 💡 UPDATED: Prepend a system message to the history for stronger persona
        const formattedHistory = [{
            role: 'user', // We use 'user' role for the instruction
            parts: [{ text: projectDocumentation }]
        }, ...historyFromDB.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }))];

        const newUserMessage = new AIChatMessage({
            userId,
            role: 'user',
            content: userMessage
        });
        await newUserMessage.save();

        const chat = model.startChat({
            // 💡 UPDATED: system_instruction removed, using history instead
            history: formattedHistory,
            generationConfig: {
                maxOutputTokens: 200,
                temperature: 0.9,
            },
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
        });

        // The user's new message is sent here.
        const result = await chat.sendMessage(userMessage);
        const botResponse = result.response.text();
        
        const newBotMessage = new AIChatMessage({
            userId,
            role: 'assistant',
            content: botResponse
        });
        await newBotMessage.save();

        res.json({ message: botResponse });
    } catch (error) {
        console.error('Error calling Gemini API or saving message:', error);
        res.status(500).json({ error: 'Failed to get a response from the chatbot.' });
    }
});

module.exports = router;