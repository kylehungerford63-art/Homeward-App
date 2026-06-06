const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'www')));
app.use('/icons', express.static(path.join(__dirname, '..', 'icons')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'www', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
