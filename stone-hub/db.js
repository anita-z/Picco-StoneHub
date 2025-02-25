// Initialize Firebase admin SDK
// Reference: 
//  How to create and connect to a firestore database in an express app ?
//  https://dev.to/ikramkharbouch/how-to-create-and-connect-to-a-firestore-database-in-an-express-app--4j84

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.databaseURL
});

const db = admin.firestore();
module.exports = db;