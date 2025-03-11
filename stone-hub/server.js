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
app.use(require('./routes/testCollection.js'));
app.use(require('./routes/models.js'));
app.use(require('./routes/connectionTypes.js'));

// Only listen on a port if we’re NOT running in Cloud Functions
if (process.env.FUNCTIONS_EMULATOR) {
  // If you’re not using the Firebase emulator, run the local server
  const PORT = 8070;
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}...`));
}
