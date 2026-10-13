const SupabaseService = require('../services/supabaseService');

const dashboardController = {
  // GET /api/dashboard/stats?teamId=...
  async getStats(req, res) {
    try {
      const userId = req.user.id;
      let teamId = req.query.teamId || req.headers['x-team-id'];

      if (!teamId) {
        const userTeams = await SupabaseService.getUserTeams(userId);
        if (userTeams.length > 0) {
          teamId = userTeams[0].id;
        }
      }

      const connectionStatus = await SupabaseService.checkConnection();

      if (!teamId) {
        return res.json({
          success: true,
          data: {
            team: null,
            stats: {
              activeWorkflows: 0,
              totalWorkflows: 0,
              pendingTasks: 0,
              completedTasks: 0,
              overdueTasks: 0,
              automationRuns: 0,
              memberCount: 0,
            },
            activeWorkflows: [],
            myTasks: [],
            overdueTasks: [],
            recentActivity: [],
            systemStatus: {
              database: 'Supabase PostgreSQL',
              connected: connectionStatus.connected,
              user: req.user,
            },
          },
        });
      }

      const data = await SupabaseService.getTeamDashboard(teamId, userId);

      res.json({
        success: true,
        data: {
          ...data,
          systemStatus: {
            database: 'Supabase PostgreSQL',
            connected: connectionStatus.connected,
            user: req.user,
          },
        },
      });
    } catch (err) {
      console.error('[Dashboard Stats Error]:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to fetch dashboard metrics' });
    }
  },
};

module.exports = dashboardController;
