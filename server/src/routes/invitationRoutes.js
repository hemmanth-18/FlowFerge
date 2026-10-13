const express = require('express');
const router = express.Router();
const invitationController = require('../controllers/invitationController');
const authMiddleware = require('../middleware/auth');
const SupabaseService = require('../services/supabaseService');

// Optional auth middleware for viewing invitation metadata before logging in
const optionalAuth = async (req, res, next) => {
  try {
    let token = null;
    if (req.cookies && req.cookies.flowforge_session) {
      token = req.cookies.flowforge_session;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const session = await SupabaseService.getSession(token);
      const user = await SupabaseService.getUserById(session?.userId || token);
      if (user) req.user = SupabaseService.sanitizeUser(user);
    }
  } catch (e) {}
  next();
};

// Public / optional auth endpoint to fetch invitation details
router.get('/:id', optionalAuth, invitationController.getInvitationDetails);

// All subsequent routes require authentication
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
