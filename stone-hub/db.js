// Initialize Firebase admin SDK
// Reference: 
//  1. How to create and connect to a firestore database in an express app ?
//    https://dev.to/ikramkharbouch/how-to-create-and-connect-to-a-firestore-database-in-an-express-app--4j84
//  2. Authenticate with admin privileges
//    https://firebase.google.com/docs/database/admin/start#authenticate-with-admin-privileges

const admin = require("firebase-admin");
// const serviceAccount = require("./serviceAccountKey.json");

// Decode the Base64 string into a JSON object
const { FIREBASE_CREDENTIALS, DATABASE_URL } = require('./config.js');
const serviceAccount = JSON.parse(Buffer.from(FIREBASE_CREDENTIALS, "base64").toString("utf-8"));


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: DATABASE_URL
});

const db = admin.firestore();
module.exports = db;