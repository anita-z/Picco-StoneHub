const express = require('express');
const session = require('cookie-session');
const { SERVER_SESSION_SECRET } = require('./config.js');
require('dotenv').config();

let app = express();
app.use(express.static('wwwroot'));
app.use(session({ secret: SERVER_SESSION_SECRET, maxAge: 24 * 60 * 60 * 1000 }));
app.use(require('./routes/auth.js'));
app.use(require('./routes/hubs.js'));


// Only listen on a port if we’re NOT running in Cloud Functions
if (process.env.FUNCTIONS_EMULATOR) {
    // If you’re not using the Firebase emulator, run the local server
    const PORT = 8080;
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}...`));
  }
