const SupabaseService = require('../services/supabaseService');

const userController = {
  // GET /api/users/search?q=
  async searchUsers(req, res) {
    try {
      const q = req.query.q || '';
      const currentUserId = req.user.id;
      const limit = parseInt(req.query.limit, 10) || 20;

      const results = await SupabaseService.searchUsers(q, currentUserId, limit);
      return res.json({
        success: true,
        data: results,
      });
    } catch (err) {
      console.error('[Search Users Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to search users.' });
    }
  },

  // GET /api/users/me
  async getMyProfile(req, res) {
    try {
      const userId = req.user.id;
      const profile = await SupabaseService.getUserProfile(userId);

      // Also get owned workflows and shared workflows summary
      const ownedWorkflows = await SupabaseService.getWorkflowsForUser(userId, { filter: 'owned' });
      const sharedWorkflows = await SupabaseService.getWorkflowsForUser(userId, { filter: 'shared' });

      return res.json({
        success: true,
        data: {
          ...profile,
          ownedWorkflowsCount: ownedWorkflows.length,
          sharedWorkflowsCount: sharedWorkflows.length,
          ownedWorkflows: ownedWorkflows.map((w) => ({ id: w.id, name: w.name, status: w.status })),
          sharedWorkflows: sharedWorkflows.map((w) => ({
            id: w.id,
            name: w.name,
            userRole: w.userRole,
            teamName: w.teamName,
          })),
        },
      });
    } catch (err) {
      console.error('[Get My Profile Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch user profile.' });
    }
  },

  // PUT /api/users/me
  async updateMyProfile(req, res) {
    try {
      const userId = req.user.id;
      const { name, avatar } = req.body;

      // Ensure no role tampering: only permitted profile fields are updated
      const updatedUser = await SupabaseService.updateUserProfile(userId, { name, avatar });

      return res.json({
        success: true,
        message: 'Profile updated successfully.',
        data: updatedUser,
      });
    } catch (err) {
      console.error('[Update Profile Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to update profile.' });
    }
  },

  // GET /api/users/:username
  async getUserByUsername(req, res) {
    try {
      const { username } = req.params;
      const user = await SupabaseService.getUserByUsername(username);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: `User @${username} was not found.`,
        });
      }

      // Return public profile info only (never passwords, sessions, or private workflows)
      return res.json({
        success: true,
        data: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
      });
    } catch (err) {
      console.error('[Get User By Username Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve user.' });
    }
  },
};

module.exports = userController;
