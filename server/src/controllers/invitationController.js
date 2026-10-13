const SupabaseService = require('../services/supabaseService');
const mailService = require('../services/mailService');

const invitationController = {
  // POST /api/invitations
  async createInvitation(req, res) {
    try {
      const senderUserId = req.user.id;
      const { type = 'WORKFLOW', resourceId, role = 'MEMBER', recipientIdentifier } = req.body;

      if (!resourceId) {
        return res.status(400).json({ success: false, error: 'Resource ID is required.' });
      }
      if (!recipientIdentifier || !recipientIdentifier.trim()) {
        return res.status(400).json({ success: false, error: 'Recipient username or email is required.' });
      }

      // Validate workflow permissions if type === 'WORKFLOW'
      if (type === 'WORKFLOW') {
        const wf = await SupabaseService.getWorkflowById(resourceId);
        if (!wf) {
          return res.status(404).json({ success: false, error: 'Workflow not found.' });
        }

        // Only workflow owner or manager can invite
        const isOwner = wf.ownerId === senderUserId || wf.createdBy === senderUserId;
        const memRole = await SupabaseService.getWorkflowMemberRole(resourceId, senderUserId);
        const isManager = memRole === 'MANAGER' || memRole === 'OWNER';

        if (!isOwner && !isManager) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Only Workflow Owners and Managers can invite collaborators.',
          });
        }

        // Validate role: Manager, Member, Viewer
        const allowedRoles = ['MANAGER', 'MEMBER', 'VIEWER'];
        if (!allowedRoles.includes(role)) {
          return res.status(400).json({
            success: false,
            error: `Invalid workflow role "${role}". Allowed roles: ${allowedRoles.join(', ')}`,
          });
        }
      }

      const invitation = await SupabaseService.createUniversalInvitation(senderUserId, {
        workflowId: resourceId,
        role,
        targetIdentifier: recipientIdentifier.trim(),
      });

      // If recipient is an email address, attempt to send invitation email
      const targetEmail = recipientIdentifier.includes('@')
        ? recipientIdentifier.trim()
        : invitation.invitedUser?.email;

      if (targetEmail) {
        const baseUrl = (process.env.APP_BASE_URL || 'https://flow-ferge.vercel.app').replace(/\/+$/, '');
        const invitationUrl = `${baseUrl}/invite/${invitation.id}`;
        mailService.sendWorkflowInvitationEmail({
          to: targetEmail,
          inviterName: req.user.name || req.user.username || 'A colleague',
          workflowTitle: invitation.workflowTitle || 'FlowForge Workflow',
          role,
          invitationUrl,
          expiresAt: invitation.expiresAt,
        }).catch((err) => console.warn('[MailService] Workflow email failed:', err.message));
      }

      return res.status(201).json({
        success: true,
        message: `Invitation sent to ${invitation.invitedUser?.name || recipientIdentifier}.`,
        data: invitation,
      });
    } catch (err) {
      console.error('[Create Invitation Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to create invitation.' });
    }
  },

  // GET /api/invitations/received
  async getReceivedInvitations(req, res) {
    try {
      const userId = req.user.id;
      const invitations = await SupabaseService.getReceivedInvitations(userId);
      return res.json({
        success: true,
        data: invitations,
      });
    } catch (err) {
      console.error('[Get Received Invitations Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve received invitations.' });
    }
  },

  // GET /api/invitations/sent
  async getSentInvitations(req, res) {
    try {
      const userId = req.user.id;
      const invitations = await SupabaseService.getSentInvitations(userId);
      return res.json({
        success: true,
        data: invitations,
      });
    } catch (err) {
      console.error('[Get Sent Invitations Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve sent invitations.' });
    }
  },

  // GET /api/invitations/:id (Details for acceptance page)
  async getInvitationDetails(req, res) {
    try {
      const { id } = req.params;
      const invitation = await SupabaseService.getInvitationById(id);
      if (!invitation) {
        return res.status(404).json({ success: false, error: 'Invitation not found or invalid invitation link.' });
      }

      let isAlreadyMember = false;
      const userId = req.user?.id;
      if (userId) {
        if (invitation.type === 'TEAM') {
          const role = await SupabaseService.getTeamMemberRole(invitation.resourceId, userId);
          if (role) isAlreadyMember = true;
        } else if (invitation.type === 'WORKFLOW') {
          const role = await SupabaseService.getWorkflowMemberRole(invitation.resourceId, userId);
          if (role) isAlreadyMember = true;
        }
      }

      return res.json({
        success: true,
        data: {
          ...invitation,
          isAlreadyMember,
        },
      });
    } catch (err) {
      console.error('[Get Invitation Details Error]:', err);
      return res.status(500).json({ success: false, error: 'Failed to retrieve invitation details.' });
    }
  },

  // POST /api/invitations/:id/accept
  async acceptInvitation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      let result;
      if (id.startsWith('tinv_')) {
        result = await SupabaseService.acceptTeamInvitation(id, userId);
      } else if (id.startsWith('winv_')) {
        result = await SupabaseService.acceptWorkflowInvitation(id, userId);
      } else {
        // Try workflow first, fallback to team
        try {
          result = await SupabaseService.acceptWorkflowInvitation(id, userId);
        } catch (wfErr) {
          result = await SupabaseService.acceptTeamInvitation(id, userId);
        }
      }

      return res.json({
        success: true,
        message: 'Invitation accepted! You now have access.',
        data: result,
      });
    } catch (err) {
      console.error('[Accept Invitation Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to accept invitation.' });
    }
  },

  // POST /api/invitations/:id/decline
  async declineInvitation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      let result;
      if (id.startsWith('tinv_')) {
        result = await SupabaseService.declineTeamInvitation(id, userId);
      } else {
        result = await SupabaseService.declineWorkflowInvitation(id, userId);
      }

      return res.json({
        success: true,
        message: 'Invitation declined.',
        data: result,
      });
    } catch (err) {
      console.error('[Decline Invitation Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to decline invitation.' });
    }
  },

  // POST /api/invitations/:id/cancel
  async cancelInvitation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await SupabaseService.cancelWorkflowInvitation(id, userId);
      return res.json({
        success: true,
        message: 'Invitation cancelled.',
        data: result,
      });
    } catch (err) {
      console.error('[Cancel Invitation Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to cancel invitation.' });
    }
  },
};

module.exports = invitationController;
