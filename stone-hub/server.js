require('dotenv').config();
const express = require('express');
const session = require('cookie-session');
const { SERVER_SESSION_SECRET } = require('./config.js');

// Initialize express app
let app = express();
app.use(express.static('wwwroot'));
app.use(session({ secret: SERVER_SESSION_SECRET, maxAge: 24 * 60 * 60 * 1000 }));
app.use(require('./routes/auth.js'));
app.use(require('./routes/hubs.js'));

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

// test on firestore connection, success :)
// everytime the below codes run, it will create a new document inside "testCollection"
/*
app.get('/test-firestore', async (req, res) => {
  try {
    const docRef = await db.collection('testCollection').add({ message: 'Hello Firestore!' });
    return res.send(`Created doc with ID: ${docRef.id}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Error writing to Firestore');
  }
});
*/


// Only listen on a port if we’re NOT running in Cloud Functions
if (process.env.FUNCTIONS_EMULATOR) {
  // If you’re not using the Firebase emulator, run the local server
  const PORT = 8080;
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));
}
