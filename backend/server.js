/*
 backend/server.js
 Minimal Express server that serves the static site in ../www
 and serves the icons folder at /icons
 Uses a regex fallback (/.*/) to avoid path-to-regexp '*' parsing errors.
*/
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve main static site (adjust 'www' if your static folder is different)
app.use(express.static(path.join(__dirname, '..', 'www')));

// Serve icons folder at /icons
app.use('/icons', express.static(path.join(__dirname, '..', 'icons')));

// SPA fallback to index.html for client-side routing
// Use a regular expression route to avoid path-to-regexp errors
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'www', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
