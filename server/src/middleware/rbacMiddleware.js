const SupabaseService = require('../services/supabaseService');

/**
 * FlowForge Reusable Access Control & Anti-IDOR Middleware
 * Powered by Supabase PostgreSQL RBAC and Session Engine.
 * Supports both Team-scoped and Personal/Individual Workflow Ownership.
 * Roles: OWNER, MANAGER, MEMBER, VIEWER
 */
const rbac = {
  /**
   * 1. requireAuth()
   * Ensures req.user is populated.
   */
  requireAuth() {
    return (req, res, next) => {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }
      next();
    };
  },

  /**
   * 2. requireTeamMember(paramKey = 'teamId')
   * Validates user is an accepted member of the team.
   */
  requireTeamMember(paramKey = 'teamId') {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        let teamId = req.params[paramKey] || req.body?.teamId || req.query?.teamId;

        if (!teamId && (req.params.workflowId || req.params.id)) {
          const wfId = req.params.workflowId || req.params.id;
          const wf = await SupabaseService.getWorkflowById(wfId);
          if (wf) teamId = wf.teamId;
        }

        if (!teamId && (req.params.taskId || req.params.id)) {
          const tId = req.params.taskId || req.params.id;
          const task = await SupabaseService.getTaskById(tId);
          if (task) teamId = task.teamId;
        }

        if (!teamId) {
          return res.status(400).json({ success: false, error: 'Team identifier is required' });
        }

        const team = await SupabaseService.getTeamById(teamId);
        if (!team) {
          return res.status(404).json({ success: false, error: 'Team not found' });
        }

        if (team.status === 'ARCHIVED') {
          return res.status(403).json({ success: false, error: 'This team has been archived' });
        }

        const role = await SupabaseService.getTeamMemberRole(teamId, userId);
        if (!role) {
          return res.status(403).json({
            success: false,
            error: 'Access Denied: You are not a member of this team.',
          });
        }

        req.teamId = teamId;
        req.teamRole = role; // TEAM_ADMIN | TEAM_MANAGER | TEAM_MEMBER
        req.team = team;
        next();
      } catch (err) {
        console.error('requireTeamMember error:', err);
        res.status(500).json({ success: false, error: 'Team authorization check failed' });
      }
    };
  },

  /**
   * 3. requireTeamManager()
   * Allows TEAM_ADMIN and TEAM_MANAGER.
   */
  requireTeamManager(paramKey = 'teamId') {
    return async (req, res, next) => {
      try {
        const verifyMember = rbac.requireTeamMember(paramKey);
        await verifyMember(req, res, async () => {
          if (req.teamRole !== 'TEAM_ADMIN' && req.teamRole !== 'TEAM_MANAGER') {
            return res.status(403).json({
              success: false,
              error: 'Forbidden: This action requires Team Manager or Admin authority.',
            });
          }
          next();
        });
      } catch (err) {
        res.status(500).json({ success: false, error: 'Role authorization check failed' });
      }
    };
  },

  /**
   * 4. requireTeamAdmin()
   * Allows TEAM_ADMIN only.
   */
  requireTeamAdmin(paramKey = 'teamId') {
    return async (req, res, next) => {
      try {
        const verifyMember = rbac.requireTeamMember(paramKey);
        await verifyMember(req, res, async () => {
          if (req.teamRole !== 'TEAM_ADMIN') {
            return res.status(403).json({
              success: false,
              error: 'Forbidden: This action requires Team Admin authority.',
            });
          }
          next();
        });
      } catch (err) {
        res.status(500).json({ success: false, error: 'Admin authorization check failed' });
      }
    };
  },

  /**
   * 5. requireWorkflowAccess()
   * Checks workflow exists and user has access via:
   * 1) Workflow ownership (ownerId / createdBy === userId) -> role: OWNER
   * 2) Explicit workflow membership -> role: OWNER, MANAGER, MEMBER, VIEWER
   * 3) Team membership (if workflow.teamId exists) -> role derived from team role
   */
  requireWorkflowAccess() {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const workflowId = req.params.workflowId || req.params.id;

        if (!workflowId) {
          return res.status(400).json({ success: false, error: 'Workflow ID is required' });
        }

        const workflow = await SupabaseService.getWorkflowById(workflowId);
        if (!workflow) {
          return res.status(404).json({ success: false, error: 'Workflow not found' });
        }

        const workflowRole = await SupabaseService.getWorkflowMemberRole(workflowId, userId);

        if (!workflowRole) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You do not have permission to access this workflow.',
          });
        }

        let teamRole = null;
        if (workflow.teamId) {
          teamRole = await SupabaseService.getTeamMemberRole(workflow.teamId, userId);
        }

        req.workflow = workflow;
        req.teamId = workflow.teamId;
        req.teamRole = teamRole;
        req.workflowRole = workflowRole;
        next();
      } catch (err) {
        console.error('requireWorkflowAccess error:', err);
        res.status(500).json({ success: false, error: 'Workflow permission check failed' });
      }
    };
  },

  /**
   * 6. requireWorkflowManager()
   * Allows OWNER and MANAGER (or Team Admin/Manager).
   * Restricts MEMBER and VIEWER.
   */
  requireWorkflowManager() {
    return async (req, res, next) => {
      try {
        const verifyWf = rbac.requireWorkflowAccess();
        await verifyWf(req, res, async () => {
          const isPermitted =
            req.workflowRole === 'OWNER' ||
            req.workflowRole === 'MANAGER' ||
            req.workflowRole === 'ADMIN' ||
            req.workflowRole === 'WORKFLOW_MANAGER' ||
            req.teamRole === 'TEAM_ADMIN' ||
            req.teamRole === 'TEAM_MANAGER';

          if (!isPermitted) {
            return res.status(403).json({
              success: false,
              error: 'Forbidden: You must be a Workflow Owner or Manager to perform this action.',
            });
          }
          next();
        });
      } catch (err) {
        res.status(500).json({ success: false, error: 'Workflow manager check failed' });
      }
    };
  },

  /**
   * 7. requireWorkflowOwner()
   * Allows OWNER (or Team Admin) only.
   */
  requireWorkflowOwner() {
    return async (req, res, next) => {
      try {
        const verifyWf = rbac.requireWorkflowAccess();
        await verifyWf(req, res, async () => {
          const isOwner =
            req.workflowRole === 'OWNER' ||
            req.workflowRole === 'ADMIN' ||
            req.teamRole === 'TEAM_ADMIN' ||
            req.workflow.ownerId === req.user.id ||
            req.workflow.createdBy === req.user.id;

          if (!isOwner) {
            return res.status(403).json({
              success: false,
              error: 'Forbidden: Only the Workflow Owner can perform this action.',
            });
          }
          next();
        });
      } catch (err) {
        res.status(500).json({ success: false, error: 'Workflow owner check failed' });
      }
    };
  },

  /**
   * 8. requireTaskAccess(mode = 'view')
   * mode: 'view' | 'update' | 'assign' | 'delete'
   */
  requireTaskAccess(mode = 'view') {
    return async (req, res, next) => {
      try {
        const userId = req.user?.id;
        const taskId = req.params.id || req.params.taskId;

        if (!taskId) {
          return res.status(400).json({ success: false, error: 'Task ID is required' });
        }

        const task = await SupabaseService.getTaskById(taskId);
        if (!task) {
          return res.status(404).json({ success: false, error: 'Task not found' });
        }

        const wf = await SupabaseService.getWorkflowById(task.workflowId);
        if (!wf) {
          return res.status(404).json({ success: false, error: 'Associated workflow not found' });
        }

        const wfRole = await SupabaseService.getWorkflowMemberRole(wf.id, userId);
        if (!wfRole) {
          return res.status(403).json({
            success: false,
            error: 'Access Denied: You do not have access to this workflow or task.',
          });
        }

        const isManagerOrOwner = wfRole === 'OWNER' || wfRole === 'MANAGER';
        const isAssignee =
          task.assignedTo === userId ||
          task.assignedTo === req.user.name ||
          task.assignedTo === req.user.email ||
          task.assignedTo === `@${req.user.username}`;

        if (mode === 'delete' || mode === 'assign') {
          if (!isManagerOrOwner) {
            return res.status(403).json({
              success: false,
              error: `Forbidden: Only Workflow Owners and Managers can ${mode} tasks.`,
            });
          }
        }

        if (mode === 'update') {
          // Member can update their assigned tasks
          if (!isManagerOrOwner && !isAssignee) {
            return res.status(403).json({
              success: false,
              error: 'Forbidden: You can only update tasks assigned to you.',
            });
          }
        }

        req.task = task;
        req.workflow = wf;
        req.workflowRole = wfRole;
        next();
      } catch (err) {
        console.error('requireTaskAccess error:', err);
        res.status(500).json({ success: false, error: 'Task access check failed' });
      }
    };
  },

  /**
   * 9. requireAutomationAccess()
   * Allows Workflow OWNER and MANAGER (or Team Admin/Manager).
   */
  requireAutomationAccess() {
    return async (req, res, next) => {
      try {
        const autoId = req.params.id || req.params.autoId;
        let workflowId = req.params.workflowId || req.body?.workflowId || req.query?.workflowId;

        if (autoId && !workflowId) {
          const auto = await SupabaseService.getAutomationById(autoId);
          if (auto) workflowId = auto.workflowId;
        }

        if (!workflowId) {
          return res.status(400).json({ success: false, error: 'Workflow ID is required for automation' });
        }

        req.params.workflowId = workflowId;
        const origId = req.params.id;
        const verifyManager = rbac.requireWorkflowManager();
        await verifyManager(req, res, () => {
          if (origId) req.params.id = origId;
          next();
        });
      } catch (err) {
        res.status(500).json({ success: false, error: 'Automation permission check failed' });
      }
    };
  },
};

module.exports = rbac;
