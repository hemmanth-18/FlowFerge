const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Invitations list & create
router.post('/', invitationController.createInvitation);
router.get('/received', invitationController.getReceivedInvitations);
router.get('/sent', invitationController.getSentInvitations);

// Action endpoints
router.post('/:id/accept', invitationController.acceptInvitation);
router.post('/:id/decline', invitationController.declineInvitation);
router.post('/:id/cancel', invitationController.cancelInvitation);

module.exports = router;
