// backend/server.js
// Minimal bootstrap: import the Express app from app.js and start the server.

const app = require('./app');

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
