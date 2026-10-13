const SupabaseService = require('../services/supabaseService');

const automationController = {
  // GET /api/automations?teamId=...
  async getAllAutomations(req, res) {
    try {
      const userId = req.user.id;
      const { teamId } = req.query;

      let targetTeamId = teamId;
      if (!targetTeamId) {
        const userTeams = await SupabaseService.getUserTeams(userId);
        if (userTeams.length > 0) targetTeamId = userTeams[0].id;
      }

      if (!targetTeamId) {
        return res.json({ success: true, data: [] });
      }

      // Check team role: TEAM_MEMBER cannot view or manage automations
      const teamRole = await SupabaseService.getTeamMemberRole(targetTeamId, userId);
      if (teamRole !== 'TEAM_ADMIN' && teamRole !== 'TEAM_MANAGER') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Team Members do not have access to automation rules.',
        });
      }

      // Collect automations from all workflows in team
      const workflows = await SupabaseService.getWorkflowsForUser(userId, { teamId: targetTeamId });
      const allRules = [];
      for (const wf of workflows) {
        const rules = await SupabaseService.getAutomationsByWorkflow(wf.id);
        const annotated = rules.map((r) => ({
          ...r,
          workflowName: wf.name,
          teamId: targetTeamId,
        }));
        allRules.push(...annotated);
      }

      res.json({ success: true, data: allRules });
    } catch (err) {
      console.error('[Get Automations Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch automations' });
    }
  },

  // GET /api/workflows/:workflowId/automations
  async getWorkflowAutomations(req, res) {
    try {
      const { workflowId } = req.params;
      const rules = await SupabaseService.getAutomationsByWorkflow(workflowId);
      res.json({ success: true, data: rules });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch workflow automations' });
    }
  },

  // POST /api/workflows/:workflowId/automations
  async createAutomation(req, res) {
    try {
      const userId = req.user.id;
      const { workflowId } = req.params;
      const ruleData = req.body;

      if (!ruleData.name || !ruleData.trigger || !ruleData.action) {
        return res.status(400).json({ success: false, error: 'Rule name, trigger, and action are required' });
      }

      const rule = await SupabaseService.createAutomation(workflowId, ruleData, userId);
      res.status(201).json({ success: true, data: rule });
    } catch (err) {
      console.error('[Create Automation Error]:', err);
      res.status(400).json({ success: false, error: err.message || 'Failed to create automation' });
    }
  },

  // PUT /api/automations/:id
  async updateAutomation(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = req.body;

      const updated = await SupabaseService.updateAutomation(id, updates, userId);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to update automation' });
    }
  },

  // DELETE /api/automations/:id
  async deleteAutomation(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await SupabaseService.deleteAutomation(id, userId);
      res.json({ success: true, message: 'Automation rule deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to delete automation' });
    }
  },

  // GET /api/workflows/:workflowId/automations/logs
  async getAutomationLogs(req, res) {
    try {
      const { workflowId } = req.params;
      const logs = await SupabaseService.getAutomationLogs(workflowId, 30);
      res.json({ success: true, data: logs });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch automation logs' });
    }
  },
};

module.exports = automationController;
