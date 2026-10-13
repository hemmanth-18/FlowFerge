const express = require('express');
const router = express.Router();
const seedController = require('../controllers/seedController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.post('/', seedController.seedSampleData);
router.post('/v2', seedController.seedV2Scenario);

module.exports = router;
