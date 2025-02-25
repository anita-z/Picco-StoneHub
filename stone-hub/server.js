require('dotenv').config();
const express = require('express');
const session = require('cookie-session');
const { SERVER_SESSION_SECRET } = require('./config.js');
const serviceAccount = require("./serviceAccountKey.json");
// import { collection, addDoc } from "firebase/firestore"; 

let app = express();
app.use(express.static('wwwroot'));
app.use(session({ secret: SERVER_SESSION_SECRET, maxAge: 24 * 60 * 60 * 1000 }));
app.use(require('./routes/auth.js'));
app.use(require('./routes/hubs.js'));

// const { initializeApp, cert } = require("firebase-admin/app");
// const { getFirestore } = require("firebase-admin/firestore");
// const { collection, addDoc } = require("firebase/firestore");

// initializeApp({
//   credential: cert(serviceAccount),
//   databaseURL: process.env.databaseURL
// });

// const db = getFirestore();

// app.post("/testDB", (req, res) => {

//   let setDoc =
//     db.collection('testCollection').doc('testDoc').set(req.body);

//   res.send({ 'Message': 'Success' });

// });

// try {
//   const docRef = await addDoc(collection(db, "users"), {
//     first: "Ada",
//     last: "Lovelace",
//     born: 1815
//   });
//   console.log("Document written with ID: ", docRef.id);
// } catch (e) {
//   console.error("Error adding document: ", e);
// }

// Only listen on a port if we’re NOT running in Cloud Functions
if (process.env.FUNCTIONS_EMULATOR) {
  // If you’re not using the Firebase emulator, run the local server
  const PORT = 8080;
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));
}
