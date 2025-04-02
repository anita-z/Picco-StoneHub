require('dotenv').config();

let { APS_CLIENT_ID, APS_CLIENT_SECRET, SERVER_SESSION_SECRET, DATABASE_URL, FIREBASE_CREDENTIALS } = process.env;

if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !SERVER_SESSION_SECRET || !DATABASE_URL || !FIREBASE_CREDENTIALS) {
    console.warn('Missing some of the required environment variables.');
    process.exit(1);
}

// let APS_CALLBACK_URL;
// // Set the APS_CALLBACK_URL to local if we’re NOT running in Cloud Functions
// if (process.env.FUNCTIONS_EMULATOR) {
//     // For local
//     // Dynamically set the callback URL based on the current PORT
//     const PORT = 8070;
//     APS_CALLBACK_URL = `http://localhost:${PORT}/api/auth/callback`;
// } else {
//     // For deployment
//     APS_CALLBACK_URL = "https://picco-stonehub-connect.web.app/api/auth/callback"
// }

// const APS_CALLBACK_URL = "https://picco-stonehub.onrender.com/api/auth/callback"

const PORT = 8070;
const APS_CALLBACK_URL = `http://localhost:${PORT}/api/auth/callback`;

module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_CALLBACK_URL,
    SERVER_SESSION_SECRET,
    DATABASE_URL,
    FIREBASE_CREDENTIALS
    // PORT
};
