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
app.post('/api/incoming-sms', (req, res) => {
    const messageData = {
        from: req.body.From,
        body: req.body.Body,
        timestamp: new Date().toLocaleTimeString()
    };

    // Push the text to your website's dashboard instantly via WebSockets
    io.emit('new-sms', messageData);

    // Reply back automatically to the customer's phone
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Thanks for reaching SudBuster! Our team has received your text on our main dashboard and will reply shortly.");
    res.type('text/xml').send(twiml.toString());
});

// 3. Webhook endpoint: Twilio triggers this when someone calls your Twilio number
app.post('/api/incoming-call', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    const dial = twiml.dial({ answerOnBridge: true });
    dial.client('sudbuster_operator'); // This routes the audio directly to your website

    res.type('text/xml').send(twiml.toString());
});

server.listen(5000, () => console.log('Communication server running on port 5000'));