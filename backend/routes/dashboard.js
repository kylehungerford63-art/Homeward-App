const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const dashboardController = require('../controllers/dashboardController');

router.get('/', requireAuth, dashboardController.getDashboard);

module.exports = router;
