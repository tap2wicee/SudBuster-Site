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

// Twilio Environment Variables loaded from your hidden .env file
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const API_KEY = process.env.TWILIO_API_KEY;
const API_SECRET = process.env.TWILIO_API_SECRET;
const TWIML_APP_SID = process.env.TWILIO_TWIML_APP_SID; 
// ========================================================
// ENGINE 1: TOKEN ENGINE FOR BROWSER INTEGRATION
// ========================================================
app.get('/api/token', (req, res) => {
    try {
        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;

        const token = new AccessToken(ACCOUNT_SID, API_KEY, API_SECRET, {
            identity: 'sudbuster_operator',
            ttl: 3600 // Valid for 1 hour
        });

        const voiceGrant = new VoiceGrant({
            outgoingApplicationSid: TWIML_APP_SID,
            incomingAllow: true
        });

        token.addGrant(voiceGrant);
        res.json({ token: token.toJwt() });
    } catch (err) {
        console.error("Token Generation Failure:", err);
        res.status(500).json({ error: "Could not generate authentication handshake." });
    }
});

// ========================================================
// ENGINE 2: TEXT MESSAGE ROUTER & CALL-FORWARDING
// ========================================================
app.post('/api/incoming-sms', async (req, res) => {
    const fromNumber = req.body.From;
    const messageBody = req.body.Body;

    const messageData = {
        from: fromNumber,
        body: messageBody,
        timestamp: new Date().toLocaleTimeString()
    };

    // Broadcast to your live website console window
    io.emit('new-sms', messageData);

    // Forward a duplicate copy right to your personal mobile cell phone
    const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    try {
        await client.messages.create({
            body: `[SudBuster Web Alert] From ${fromNumber}: ${messageBody}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: process.env.MY_CELL_PHONE
        });
    } catch (error) {
        console.error("Failed to forward SMS message data:", error);
    }

    // Send a professional automated fallback receipt to the client
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Thanks for reaching out to SudBuster Mobile Detailing! We have received your message and our team will get right back to you.");
    res.type('text/xml').send(twiml.toString());
});

// ========================================================
// ENGINE 3: LIVE VOICE ROUTER & CALL-FORWARDING
// ========================================================
app.post('/api/incoming-call', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    
    const dial = twiml.dial({ 
        answerOnBridge: true,
        timeout: 20 
    });
    
    // Fork the stream: ring both your browser window client AND your cell number at the exact same time
    dial.client('sudbuster_operator'); 
    dial.number(process.env.MY_CELL_PHONE); 

    res.type('text/xml').send(twiml.toString());
});

// ========================================================
// SERVER CORE INITIALIZER
// ========================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`================================================`);
    console.log(` SUDBUSTER COMMUNICATIONS CORE ACTIVE ON PORT ${PORT} `);
    console.log(`================================================`);
});

// 1. Generate security token for frontend browser calls
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

// 2. Webhook endpoint: Twilio triggers this when someone texts your Twilio number
// 2. WEBHOOK: RECEIVE INCOMING TEXT MESSAGES & FORWARD TO CELL
app.post('/api/incoming-sms', async (req, res) => {
    const fromNumber = req.body.From;
    const messageBody = req.body.Body;

    const messageData = {
        from: fromNumber,
        body: messageBody,
        timestamp: new Date().toLocaleTimeString()
    };

    // Keep sending it to your website dashboard
    io.emit('new-sms', messageData);

    // Initialize Twilio REST Client using your hidden credentials
    const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

    try {
        // FORWARD the message straight to your personal cell phone
        await client.messages.create({
            body: `[SudBuster Web Alert] From ${fromNumber}: ${messageBody}`,
            from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
            to: process.env.MY_CELL_PHONE        // Your personal cell phone number
        });
    } catch (error) {
        console.error("Failed to forward text message to cell phone:", error);
    }

    // Send an automated receipt confirmation back to the customer's phone
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Thanks for reaching SudBuster! Our team has received your text and will reply shortly.");
    res.type('text/xml').send(twiml.toString());
});

// 3. Webhook endpoint: Twilio triggers this when someone calls your Twilio number
// 3. WEBHOOK: RECEIVE INCOMING VOICE CALLS & FORWARD TO CELL
app.post('/api/incoming-call', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Create a dial sequence that triggers simultaneously
    const dial = twiml.dial({ 
        answerOnBridge: true,
        timeout: 20 // Rings for 20 seconds before going to voicemail
    });
    
    // 1. Ring the operator logged into your website interface
    dial.client('sudbuster_operator'); 
    
    // 2. Simultaneously ring your actual cell phone number!
    dial.number(process.env.MY_CELL_PHONE); 

    res.type('text/xml').send(twiml.toString());
});