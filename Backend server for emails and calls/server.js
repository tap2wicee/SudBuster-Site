require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const twilio = require('twilio');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Twilio Environment Variables (Stored securely)
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const API_KEY = process.env.TWILIO_API_KEY;
const API_SECRET = process.env.TWILIO_API_SECRET;
const TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID; 

// 1. GENERATE ACCESS TOKEN FOR FRONTEND PHONE CALLS
app.get('/api/token', (req, res) => {
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const token = new AccessToken(ACCOUNT_SID, API_KEY, API_SECRET, { identity: 'sudbuster_operator' });
    
    const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: TWIML_APP_SID,
        incomingAllow: true
    });
    token.addGrant(voiceGrant);

    res.json({ token: token.toJwt() });
});

// 2. WEBHOOK: RECEIVE INCOMING TEXT MESSAGES
app.post('/api/incoming-sms', (req, res) => {
    const messageData = {
        from: req.body.From,
        body: req.body.Body,
        timestamp: new Date().toLocaleTimeString()
    };

    // Broadcast the message immediately to the frontend dashboard
    io.emit('new-sms', messageData);

    // Send an automated receipt confirmation back to sender
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Thanks for reaching SudBuster! Our team has received your text on our main dashboard and will reply shortly.");
    res.type('text/xml').send(twiml.toString());
});

// 3. WEBHOOK: RECEIVE INCOMING VOICE CALL ROUTING (FORWARDED TO GOOGLE VOICE)
app.post('/api/incoming-call', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Bypasses the browser dashboard and forwards any incoming tracking calls to your personal line
    twiml.dial('+13146490476'); 

    res.type('text/xml').send(twiml.toString());
});

server.listen(5000, () => console.log('Communication core running on port 5000'));