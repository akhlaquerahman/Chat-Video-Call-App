# Chat & Video Call App

Live Demo :- https://chat-video-call-app-six.vercel.app/

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/873de195-5c09-4bed-aa24-6559a8632b83" />

# 1. Introduction
This project is a modern, real-time communication platform designed to provide a unified and secure way for users to connect. It consolidates multiple communication features into a single application, allowing users to seamlessly engage in text, voice, and video conversations. The application showcases proficiency in real-time data handling, secure authentication, and robust third-party API integration.

# 2. Features
Real-Time Messaging: Instantaneous, bidirectional chat with live user status indicators ("Online," "Typing...").

Secure Video & Audio Calls: Supports high-quality, one-on-one and group calls using Twilio Video.

Conversational AI Chatbot: An integrated assistant powered by Google Gemini API for a smart, interactive user experience.

User Authentication: Secure registration and login with JWT and bcryptjs.

Profile Management: Users can update their names and profile pictures.

File Sharing: Securely share media files within chats, with uploads handled by Cloudinary.

Persistent Chat History: All chat messages are stored in the database for future access.

# 3. Technology Stack
Frontend
The client-side is a dynamic Single-Page Application (SPA) built with React.

React.js

React Router

Axios

socket.io-client

Twilio Video

Bootstrap

Backend
The server-side is a RESTful API built with Node.js and Express.js.

Node.js

Express.js

MongoDB (with Mongoose)

Socket.IO

JSON Web Tokens (JWT)

bcryptjs

Twilio

@google/generative-ai

Deployment & Services
Cloudinary (for media storage)

.env (for environment variables)

# 4. Folder Structure
The project is organized into Client and Server directories for a clear separation of concerns.

.
├── Client/
│   ├── src/
│   │   ├── Components/
│   │   │   ├── AIChatPage.jsx
│   │   │   ├── ChatPage.jsx
│   │   │   ├── VideoCall.jsx
│   │   │   └── ... (other components)
│   │   ├── App.jsx
│   │   └── index.js
│   └── ...
│
└── Server/
    ├── config/
    │   └── cloudinaryConfig.js
    ├── middleware/
    │   └── auth.js
    ├── models/
    │   ├── AIChatMessage.js
    │   ├── Message.js
    │   └── User.js
    ├── routes/
    │   ├── aiChatRoutes.js
    │   ├── authRoutes.js
    │   └── ... (other routes)
    ├── server.js
    └── socket.js
# 5. Getting Started
Follow these steps to set up and run the project locally.

Prerequisites
Node.js (v14 or higher)

npm

A MongoDB Atlas account or local instance

API keys for Twilio, Google Gemini, and Cloudinary

Installation
Clone the repository:

Bash

git clone https://github.com/your-username/Chat-Video-Call-App.git
cd Chat-Video-Call-App
Install backend dependencies:

Bash

cd Server
npm install
Create .env file in the Server directory:

Bash

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_API_KEY=your_twilio_api_key
TWILIO_API_SECRET=your_twilio_api_secret
GEMINI_API_KEY=your_gemini_api_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
Install frontend dependencies:

Bash

cd ../Client
npm install
Create .env file in the Client directory:

Bash

REACT_APP_API_URL=http://localhost:5000/api
(Note: Replace http://localhost:5000 with your deployed backend URL.)

Run the application:

Bash

# From the 'Server' directory
npm start

# From the 'Client' directory
npm start

# Live Demo :- https://chat-video-call-app-six.vercel.app/

# 6. Contact & About the Author
This project was built and is maintained by Akhlaque.

GitHub: https://github.com/akhlaquerahman

LinkedIn: https://www.linkedin.com/in/akhlaquerahman

Email: akhlaquerahman0786@gmail.com
