const SupabaseService = require('../services/supabaseService');

const teamController = {
  // POST /api/teams
  async createTeam(req, res) {
    try {
      const userId = req.user.id;
      const { name, description, icon } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Team name is required' });
      }

      const team = await SupabaseService.createTeam(userId, { name, description, icon });
      res.status(201).json({ success: true, data: team });
    } catch (err) {
      console.error('[Create Team Error]:', err);
      res.status(400).json({ success: false, error: err.message || 'Failed to create team' });
    }
  },

  // GET /api/teams (Current user's teams)
  async getUserTeams(req, res) {
    try {
      const userId = req.user.id;
      const teams = await SupabaseService.getUserTeams(userId);
      res.json({ success: true, data: teams });
    } catch (err) {
      console.error('[Get User Teams Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch user teams' });
    }
  },

  // GET /api/teams/:teamId
  async getTeamById(req, res) {
    try {
      const { teamId } = req.params;
      const team = await SupabaseService.getTeamById(teamId);
      if (!team) {
        return res.status(404).json({ success: false, error: 'Team not found' });
      }
      res.json({ success: true, data: { ...team, userRole: req.teamRole } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch team details' });
    }
  },

  // PUT /api/teams/:teamId
  async updateTeam(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;
      const updates = req.body;

      const updated = await SupabaseService.updateTeam(teamId, updates, userId);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Failed to update team' });
    }
  },

  // DELETE /api/teams/:teamId (Archive team)
  async archiveTeam(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;

      const result = await SupabaseService.archiveTeam(teamId, userId);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Failed to archive team' });
    }
  },

  // GET /api/teams/:teamId/dashboard
  async getTeamDashboard(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;

      const dashboard = await SupabaseService.getTeamDashboard(teamId, userId);
      res.json({ success: true, data: dashboard });
    } catch (err) {
      console.error('[Get Team Dashboard Error]:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to load team dashboard' });
    }
  },

  // GET /api/teams/:teamId/members
  async getTeamMembers(req, res) {
    try {
      const { teamId } = req.params;
      const members = await SupabaseService.getTeamMembers(teamId);
      res.json({ success: true, data: members });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch team members' });
    }
  },

  // PUT /api/teams/:teamId/members/:userId/role
  async updateMemberRole(req, res) {
    try {
      const { teamId, userId: targetUserId } = req.params;
      const { role } = req.body;
      const executorUserId = req.user.id;

      const updated = await SupabaseService.updateTeamMemberRole(teamId, targetUserId, role, executorUserId);
      res.json({ success: true, data: updated });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Failed to update member role' });
    }
  },

  // DELETE /api/teams/:teamId/members/:userId
  async removeMember(req, res) {
    try {
      const { teamId, userId: targetUserId } = req.params;
      const executorUserId = req.user.id;

      await SupabaseService.removeTeamMember(teamId, targetUserId, executorUserId);
      res.json({ success: true, message: 'Member removed successfully' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Failed to remove member' });
    }
  },

  // POST /api/teams/:teamId/invitations
  async createInvitation(req, res) {
    try {
      const { teamId } = req.params;
      const { email, role } = req.body;
      const inviterUserId = req.user.id;

      const invitation = await SupabaseService.createTeamInvitation(teamId, { email, role }, inviterUserId);
      res.status(201).json({ success: true, data: invitation });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Failed to send invitation' });
    }
  },

  // GET /api/teams/:teamId/invitations
  async getTeamInvitations(req, res) {
    try {
      const { teamId } = req.params;
      const invitations = await SupabaseService.getTeamInvitations(teamId);
      res.json({ success: true, data: invitations });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch team invitations' });
    }
  },

  // DELETE /api/teams/:teamId/invitations/:invitationId
  async cancelInvitation(req, res) {
    try {
      const { teamId, invitationId } = req.params;
      const executorUserId = req.user.id;

      await SupabaseService.cancelTeamInvitation(teamId, invitationId, executorUserId);
      res.json({ success: true, message: 'Invitation cancelled' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Failed to cancel invitation' });
    }
  },

  // GET /api/teams/invitations/my
  async getMyInvitations(req, res) {
    try {
      const userEmail = req.user.email;
      const invitations = await SupabaseService.getMyInvitations(userEmail);
      res.json({ success: true, data: invitations });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch my invitations' });
    }
  },

  // POST /api/teams/invitations/:invitationId/accept
  async acceptInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      const userId = req.user.id;

      const result = await SupabaseService.acceptTeamInvitation(invitationId, userId);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Failed to accept invitation' });
    }
  },

  // POST /api/teams/invitations/:invitationId/decline
  async declineInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      const userId = req.user.id;

      await SupabaseService.declineTeamInvitation(invitationId, userId);
      res.json({ success: true, message: 'Invitation declined' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Failed to decline invitation' });
    }
  },

  // GET /api/teams/:teamId/activity
  async getTeamActivity(req, res) {
    try {
      const { teamId } = req.params;
      const activity = await SupabaseService.getTeamActivity(teamId, 100);
      res.json({ success: true, data: activity });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch team activity' });
    }
  },

  // GET /api/teams/:teamId/audit
  async getTeamAudit(req, res) {
    try {
      const { teamId } = req.params;
      const logs = await SupabaseService.getTeamAuditLogs(teamId, 100);
      res.json({ success: true, data: logs });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch team audit logs' });
    }
  },

  // GET /api/teams/:teamId/tasks (Team Tasks / Manager Task View)
  async getTeamTasks(req, res) {
    try {
      const { teamId } = req.params;
      const { assignee, status, priority, workflowId, dueDate } = req.query;

      const tasks = await SupabaseService.getTeamTasks(teamId, {
        assignee,
        status,
        priority,
        workflowId,
        dueDate,
      });

      res.json({ success: true, data: tasks });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch team tasks' });
    }
  },

  // GET /api/teams/:teamId/templates
  async getTeamTemplates(req, res) {
    try {
      const { teamId } = req.params;
      const templates = SupabaseService.getTeamTemplates(teamId);
      res.json({ success: true, data: templates });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch templates' });
    }
  },

  // POST /api/teams/:teamId/templates/:templateId/instantiate
  async instantiateTemplate(req, res) {
    try {
      const { teamId, templateId } = req.params;
      const userId = req.user.id;

      const workflow = await SupabaseService.instantiateTemplate(teamId, templateId, userId);
      res.status(201).json({ success: true, data: workflow });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Failed to instantiate template' });
    }
  },

  // GET /api/teams/:teamId/search
  async searchTeam(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;
      const { q } = req.query;

      const results = await SupabaseService.searchTeamResources(teamId, userId, q);
      res.json({ success: true, data: results });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message || 'Search failed' });
    }
  },

  // GET /api/teams/profile/me (User Profile)
  async getMyProfile(req, res) {
    try {
      const userId = req.user.id;
      const profile = await SupabaseService.getUserProfile(userId);
      res.json({ success: true, data: profile });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
  },

  // GET /api/teams/all-users
  async getAllUsers(req, res) {
    try {
      const users = await SupabaseService.getAllUsers();
      res.json({ success: true, data: users });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
  },
};

module.exports = teamController;
