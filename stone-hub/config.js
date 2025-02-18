require('dotenv').config();

let { APS_CLIENT_ID, APS_CLIENT_SECRET, SERVER_SESSION_SECRET, PORT } = process.env;

if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !SERVER_SESSION_SECRET) {
    console.warn('Missing some of the required environment variables.');
    process.exit(1);
}

// Set a default port if none is specified in the .env file
PORT = PORT || 8080;


// TODO: change application running method
// For local
// Dynamically set the callback URL based on the current PORT
const APS_CALLBACK_URL = `http://localhost:${PORT}/api/auth/callback`;

// For deployment
// const APS_CALLBACK_URL = "https://picco-stonehub.onrender.com/api/auth/callback"

module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_CALLBACK_URL,
    SERVER_SESSION_SECRET,
    PORT
};
