const SupabaseService = require('../services/supabaseService');
const mailService = require('../services/mailService');

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

      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'Valid recipient email address is required.' });
      }

      // 1. Create invitation record in Supabase / memory store
      const invitation = await SupabaseService.createTeamInvitation(teamId, { email: email.trim(), role }, inviterUserId);

      // 2. Generate production-ready invitation URL
      const baseUrl = (process.env.APP_BASE_URL || 'https://flow-ferge.vercel.app').replace(/\/+$/, '');
      const invitationUrl = `${baseUrl}/invite/${invitation.id}`;
      const inviterName = req.user.name || req.user.username || 'A team manager';

      // 3. Dispatch real invitation email via Nodemailer Gmail SMTP (with cloud race protection)
      let mailResult = { success: false, message: 'Email dispatch initiated' };
      try {
        const emailPromise = mailService.sendTeamInvitationEmail({
          to: invitation.email,
          inviterName,
          teamName: invitation.teamName,
          role: invitation.role,
          invitationUrl,
          expiresAt: invitation.expiresAt,
        }).catch((err) => {
          console.warn('[MailService] Team invite email async error:', err.message);
          return { success: false, error: err.message };
        });

        // 2.5s maximum wait so the user interface never freezes
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ success: true, pending: true, message: 'Invitation created. Email sending in background.' }), 2500)
        );

        mailResult = await Promise.race([emailPromise, timeoutPromise]);
      } catch (mailErr) {
        console.warn('[Team Invitation Mail Error]:', mailErr.message);
        mailResult = { success: false, error: mailErr.message };
      }

      res.status(201).json({
        success: true,
        data: invitation,
        emailSent: mailResult.success,
        emailMessage: mailResult.success
          ? `Invitation sent to ${invitation.email}!`
          : (mailResult.message || 'Invitation created successfully!'),
      });
    } catch (err) {
      console.error('[Create Team Invitation Error]:', err);
      res.status(400).json({ success: false, error: err.message || 'Failed to send invitation' });
    }
  },

  // POST /api/teams/:teamId/invitations/:invitationId/resend
  async resendInvitation(req, res) {
    try {
      const { teamId, invitationId } = req.params;

      const invitation = await SupabaseService.getInvitationById(invitationId);
      if (!invitation || invitation.resourceId !== teamId) {
        return res.status(404).json({ success: false, error: 'Invitation not found for this team.' });
      }

      if (invitation.status !== 'PENDING') {
        return res.status(400).json({ success: false, error: `Cannot resend an invitation with status: ${invitation.status}` });
      }

      if (invitation.isExpired) {
        return res.status(400).json({ success: false, error: 'This invitation has expired. Please create a new invitation.' });
      }

      const baseUrl = (process.env.APP_BASE_URL || 'https://flow-ferge.vercel.app').replace(/\/+$/, '');
      const invitationUrl = `${baseUrl}/invite/${invitation.id}`;
      const inviterName = req.user.name || req.user.username || invitation.inviterName || 'A team manager';

      let mailResult = { success: false, message: 'Email dispatch initiated' };
      try {
        const emailPromise = mailService.sendTeamInvitationEmail({
          to: invitation.email,
          inviterName,
          teamName: invitation.resourceName,
          role: invitation.role,
          invitationUrl,
          expiresAt: invitation.expiresAt,
        }).catch((err) => {
          console.warn('[MailService] Team resend email async error:', err.message);
          return { success: false, error: err.message };
        });

        // 2.5s maximum wait so the UI never freezes
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ success: true, pending: true, message: 'Invitation active. Email sending in background.' }), 2500)
        );

        mailResult = await Promise.race([emailPromise, timeoutPromise]);
      } catch (mailErr) {
        console.warn('[Team Resend Mail Error]:', mailErr.message);
        mailResult = { success: false, error: mailErr.message };
      }

      res.json({
        success: true,
        message: mailResult.success
          ? `Invitation email resent to ${invitation.email}`
          : (mailResult.message || 'Invitation is active.'),
        emailSent: mailResult.success,
        data: invitation,
      });
    } catch (err) {
      console.error('[Resend Invitation Error]:', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to resend invitation' });
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

  // POST /api/teams/:teamId/documents
  // Admins & Managers can upload a document to specific or all team workflows
  async sendTeamDocumentToWorkflows(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;
      const file = req.file;
      const { workflowId, isPrivate, description } = req.body;

      if (!file) {
        return res.status(400).json({ success: false, error: 'No document file provided.' });
      }

      // Fetch team workflows
      const teamWorkflows = await SupabaseService.getWorkflowsByTeam(teamId, userId);
      if (!teamWorkflows || teamWorkflows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No active workflows exist in this team. Please create a workflow first to attach documents.',
        });
      }

      let targetWorkflows = [];
      if (!workflowId || workflowId === 'all') {
        targetWorkflows = teamWorkflows;
      } else {
        const targetIds = Array.isArray(workflowId) ? workflowId : [workflowId];
        targetWorkflows = teamWorkflows.filter((w) => targetIds.includes(w.id));
        if (targetWorkflows.length === 0) {
          return res.status(400).json({ success: false, error: 'Selected workflow not found in this team.' });
        }
      }

      const results = [];
      const privateFlag = isPrivate === 'true' || isPrivate === true;

      for (const wf of targetWorkflows) {
        const doc = await SupabaseService.saveWorkflowDocument({
          workflowId: wf.id,
          file,
          uploadedBy: userId,
          description: description || `Shared from team by ${req.user.name || 'Team Admin'}`,
          isPrivate: privateFlag,
        });
        results.push({ ...doc, workflowName: wf.name });
      }

      return res.status(201).json({
        success: true,
        message:
          targetWorkflows.length > 1
            ? `Document distributed to all ${targetWorkflows.length} workflows successfully!`
            : `Document attached to "${targetWorkflows[0].name}" successfully!`,
        count: results.length,
        data: results,
      });
    } catch (err) {
      console.error('[Send Team Document Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to send document.' });
    }
  },

  // GET /api/teams/:teamId/documents
  // Fetch all documents across workflows in this team
  async getTeamDocuments(req, res) {
    try {
      const { teamId } = req.params;
      const userId = req.user.id;
      const teamWorkflows = await SupabaseService.getWorkflowsByTeam(teamId, userId);
      const workflowMap = new Map((teamWorkflows || []).map((w) => [w.id, w.name]));

      const allDocs = [];
      for (const wf of teamWorkflows || []) {
        const docs = await SupabaseService.getWorkflowDocuments(wf.id);
        for (const doc of docs) {
          allDocs.push({
            ...doc,
            workflowName: workflowMap.get(doc.workflowId) || 'Workflow',
          });
        }
      }

      allDocs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ success: true, data: allDocs });
    } catch (err) {
      console.error('[Get Team Documents Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to fetch team documents.' });
    }
  },
};

module.exports = teamController;
