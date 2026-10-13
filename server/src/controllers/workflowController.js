const SupabaseService = require('../services/supabaseService');

const workflowController = {
  // GET /api/workflows?filter=all|owned|shared&teamId=...
  async getWorkflows(req, res) {
    try {
      const userId = req.user.id;
      const filter = req.query.filter || 'all'; // 'all' | 'owned' | 'shared'
      const teamId = req.query.teamId || null;

      const workflows = await SupabaseService.getWorkflowsForUser(userId, { filter, teamId });
      return res.json({ success: true, data: workflows });
    } catch (err) {
      console.error('[Get Workflows Error]:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch workflows' });
    }
  },

  // GET /api/workflows/:id
  async getWorkflowById(req, res) {
    try {
      const { id } = req.params;
      const workflow = req.workflow || (await SupabaseService.getWorkflowById(id));
      if (!workflow) {
        return res.status(404).json({ success: false, error: 'Workflow not found' });
      }

      const tasks = await SupabaseService.getTasksByWorkflow(id);
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      let team = null;
      if (workflow.teamId) {
        team = await SupabaseService.getTeamById(workflow.teamId);
      }

      const owner = await SupabaseService.getUserById(workflow.ownerId || workflow.createdBy);

      return res.json({
        success: true,
        data: {
          ...workflow,
          ownerName: owner?.name || 'Owner',
          ownerUsername: owner?.username || '',
          teamName: team?.name || null,
          teamIcon: team?.icon || null,
          tasks,
          totalTasks,
          completedTasks,
          progress,
          userRole: req.workflowRole || 'VIEWER',
          teamRole: req.teamRole || null,
        },
      });
    } catch (err) {
      console.error('[Get Workflow By Id Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch workflow' });
    }
  },

  // POST /api/workflows
  async createWorkflow(req, res) {
    try {
      const userId = req.user.id;
      const { teamId, name, description, status, nodes, dependencies, isRestricted } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Workflow name is required' });
      }

      const workflow = await SupabaseService.createWorkflow(userId, {
        teamId: teamId || null,
        name: name.trim(),
        description: description?.trim() || '',
        status: status || 'ACTIVE',
        nodes: nodes || [],
        dependencies: dependencies || [],
        isRestricted: !!isRestricted,
      });

      return res.status(201).json({ success: true, data: workflow });
    } catch (err) {
      console.error('[Create Workflow Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to create workflow' });
    }
  },

  // PUT /api/workflows/:id
  async updateWorkflow(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const workflow = await SupabaseService.updateWorkflow(id, updates, userId);
      return res.json({ success: true, data: workflow });
    } catch (err) {
      console.error('[Update Workflow Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to update workflow' });
    }
  },

  // DELETE /api/workflows/:id
  async deleteWorkflow(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await SupabaseService.deleteWorkflow(id, userId);
      return res.json({ success: true, message: 'Workflow deleted successfully' });
    } catch (err) {
      console.error('[Delete Workflow Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to delete workflow' });
    }
  },

  // POST /api/workflows/:id/duplicate
  async duplicateWorkflow(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const duplicated = await SupabaseService.duplicateWorkflow(id, userId);
      return res.status(201).json({
        success: true,
        message: 'Workflow duplicated successfully',
        data: duplicated,
      });
    } catch (err) {
      console.error('[Duplicate Workflow Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to duplicate workflow' });
    }
  },

  // POST /api/workflows/:id/share
  async shareWorkflow(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { recipientIdentifier, role = 'MEMBER' } = req.body;

      if (!recipientIdentifier || !recipientIdentifier.trim()) {
        return res.status(400).json({ success: false, error: 'Recipient username or email is required' });
      }

      const invitation = await SupabaseService.createUniversalInvitation(userId, {
        workflowId: id,
        targetIdentifier: recipientIdentifier.trim(),
        role,
      });

      return res.status(201).json({
        success: true,
        message: `Invitation sent to ${invitation.invitedUser?.name || recipientIdentifier}`,
        data: invitation,
      });
    } catch (err) {
      console.error('[Share Workflow Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to share workflow' });
    }
  },

  // GET /api/workflows/:id/members
  async getWorkflowMembers(req, res) {
    try {
      const { id } = req.params;
      const members = await SupabaseService.getWorkflowMembers(id);
      return res.json({ success: true, data: members });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch workflow members' });
    }
  },

  // GET /api/workflows/:id/invitations
  async getWorkflowInvitations(req, res) {
    try {
      const { id } = req.params;
      const invitations = await SupabaseService.getWorkflowInvitations(id);
      return res.json({ success: true, data: invitations });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch workflow invitations' });
    }
  },

  // POST /api/workflows/:id/members
  async addWorkflowMember(req, res) {
    try {
      const { id: workflowId } = req.params;
      const { userId: targetUserId, role = 'MEMBER' } = req.body;

      if (!targetUserId) {
        return res.status(400).json({ success: false, error: 'Target user ID is required' });
      }

      const normalizedRole = role.replace(/^WORKFLOW_/, '');
      const member = await SupabaseService.addWorkflowMember(workflowId, targetUserId, normalizedRole);
      return res.status(201).json({ success: true, data: member });
    } catch (err) {
      console.error('[Add Workflow Member Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to add workflow member' });
    }
  },

  // PUT /api/workflows/:id/members/:userId/role
  async updateWorkflowMemberRole(req, res) {
    try {
      const { id: workflowId, userId: targetUserId } = req.params;
      const { role } = req.body;
      const executorUserId = req.user.id;

      const normalizedRole = (role || 'MEMBER').replace(/^WORKFLOW_/, '');
      const result = await SupabaseService.updateWorkflowMemberRole(workflowId, targetUserId, normalizedRole, executorUserId);
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message || 'Failed to update workflow member' });
    }
  },

  // DELETE /api/workflows/:id/members/:userId
  async removeWorkflowMember(req, res) {
    try {
      const { id: workflowId, userId: targetUserId } = req.params;
      const executorUserId = req.user.id;

      await SupabaseService.removeWorkflowMember(workflowId, targetUserId, executorUserId);
      return res.json({ success: true, message: 'Member removed from workflow successfully' });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message || 'Failed to remove workflow member' });
    }
  },
};

module.exports = workflowController;
