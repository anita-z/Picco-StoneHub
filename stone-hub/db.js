// Initialize Firebase admin SDK
// Reference: 
//  How to create and connect to a firestore database in an express app ?
//  https://dev.to/ikramkharbouch/how-to-create-and-connect-to-a-firestore-database-in-an-express-app--4j84

const admin = require("firebase-admin");
// const serviceAccount = require("./serviceAccountKey.json");

// Decode the Base64 string into a JSON object
const { FIREBASE_CREDENTIALS } = require('./config.js');
const serviceAccount = JSON.parse(Buffer.from(FIREBASE_CREDENTIALS, "base64").toString("utf-8"));


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.databaseURL
});

const db = admin.firestore();
module.exports = db;