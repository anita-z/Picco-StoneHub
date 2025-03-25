require('dotenv').config();
const express = require('express');
const session = require('cookie-session');
const { SERVER_SESSION_SECRET } = require('./config.js');

// Initialize express app
let app = express();
app.use(express.json());
app.use(session({ secret: SERVER_SESSION_SECRET, maxAge: 24 * 60 * 60 * 1000 }));

// Register API routes
app.use(require('./routes/auth.js'));
app.use(require('./routes/hubs.js'));
app.use(require('./routes/testCollection.js'));
app.use(require('./routes/models.js'));
app.use(require('./routes/connectionTypes.js'));

// app.use((req, res, next) => {
//   console.log(`📡 Incoming ${req.method} ${req.url}`);
//   next();
// });

// const listEndpoints = require('express-list-endpoints');
// console.log(listEndpoints(app));

// Serve static files
app.use(express.static('wwwroot'));


// Only listen on a port if we’re NOT running in Cloud Functions
if (process.env.FUNCTIONS_EMULATOR) {
  // If you’re not using the Firebase emulator, run the local server
  const PORT = 8070;
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}...`));
}
