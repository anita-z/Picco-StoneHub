// Initialize Firebase admin SDK
// Reference: 
//  1. How to create and connect to a firestore database in an express app ?
//    https://dev.to/ikramkharbouch/how-to-create-and-connect-to-a-firestore-database-in-an-express-app--4j84
//  2. Authenticate with admin privileges
//    https://firebase.google.com/docs/database/admin/start#authenticate-with-admin-privileges

var admin = require("firebase-admin");
// const serviceAccount = require("./serviceAccountKey.json");

// Decode the Base64 string into a JSON object
const { FIREBASE_CREDENTIALS } = require('./config.js');
var serviceAccount = JSON.parse(Buffer.from(FIREBASE_CREDENTIALS, "base64").toString("utf-8"));


admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.databaseURL
});

var db = admin.firestore();
module.exports = db;