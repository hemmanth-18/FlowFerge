const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Search directory
router.get('/search', userController.searchUsers);

// Current user profile
router.get('/me', userController.getMyProfile);
router.put('/me', userController.updateMyProfile);

// Public user profile lookup
router.get('/:username', userController.getUserByUsername);

module.exports = router;
