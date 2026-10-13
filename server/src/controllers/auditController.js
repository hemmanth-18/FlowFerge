const SupabaseService = require('../services/supabaseService');

const auditController = {
  // GET /api/audit?teamId=...
  async getAuditLogs(req, res) {
    try {
      const userId = req.user.id;
      let teamId = req.query.teamId || req.headers['x-team-id'];

      if (!teamId) {
        const userTeams = await SupabaseService.getUserTeams(userId);
        if (userTeams.length > 0) teamId = userTeams[0].id;
      }

      if (teamId) {
        // Enforce: only TEAM_ADMIN and TEAM_MANAGER can view audit logs
        const role = await SupabaseService.getTeamMemberRole(teamId, userId);
        if (role !== 'TEAM_ADMIN' && role !== 'TEAM_MANAGER') {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Team Members cannot view security audit logs.',
          });
        }
        const logs = await SupabaseService.getTeamAuditLogs(teamId, 100);
        return res.json({ success: true, data: logs });
      }

      const logs = await SupabaseService.getTeamAuditLogs(null, 100);
      res.json({ success: true, data: logs });
    } catch (err) {
      console.error('[Get Audit Logs Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
    }
  },

  // GET /api/audit/workflow/:workflowId
  async getWorkflowAuditLogs(req, res) {
    try {
      const { workflowId } = req.params;
      const wf = await SupabaseService.getWorkflowById(workflowId);
      if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });

      const logs = await SupabaseService.getTeamAuditLogs(wf.teamId, 50);
      const filtered = logs.filter((l) => l.workflowId === workflowId || l.resourceId === workflowId);
      res.json({ success: true, data: filtered });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch workflow audit logs' });
    }
  },
};

module.exports = auditController;
