const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', notificationController.getNotifications);

// Support both PATCH and PUT for convenience
router.patch('/:id/read', notificationController.markRead);
router.put('/:id/read', notificationController.markRead);

router.patch('/read-all', notificationController.markAllRead);
router.put('/read-all', notificationController.markAllRead);

router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
