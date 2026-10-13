const SupabaseService = require('../services/supabaseService');
const AutomationEngine = require('../services/automationEngine');

const taskController = {
  // GET /api/tasks?teamId=...&mine=true
  async getAllTasks(req, res) {
    try {
      const userId = req.user.id;
      const { teamId, mine } = req.query;

      let tasks = [];
      if (mine === 'true') {
        tasks = await SupabaseService.getMyTasks(userId, teamId);
      } else if (teamId) {
        // Check role in team
        const role = await SupabaseService.getTeamMemberRole(teamId, userId);
        if (role === 'TEAM_ADMIN' || role === 'TEAM_MANAGER') {
          tasks = await SupabaseService.getTeamTasks(teamId, req.query);
        } else {
          // Team Member only sees their own tasks
          tasks = await SupabaseService.getMyTasks(userId, teamId);
        }
      } else {
        tasks = await SupabaseService.getMyTasks(userId);
      }

      res.json({ success: true, data: tasks });
    } catch (err) {
      console.error('[Get All Tasks Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
    }
  },

  // GET /api/workflows/:workflowId/tasks
  async getTasksByWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const tasks = await SupabaseService.getTasksByWorkflow(workflowId);
      res.json({ success: true, data: tasks });
    } catch (err) {
      console.error('[Get Tasks By Workflow Error]:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch workflow tasks' });
    }
  },

  // GET /api/tasks/:id
  async getTaskById(req, res) {
    try {
      res.json({ success: true, data: req.task });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch task' });
    }
  },

  // POST /api/workflows/:workflowId/tasks
  async createTask(req, res) {
    try {
      const userId = req.user.id;
      const { workflowId } = req.params;
      const { title, description, status, priority, dueDate, assignedTo, position } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, error: 'Task title is required' });
      }

      const task = await SupabaseService.createTask(userId, {
        workflowId,
        title: title.trim(),
        description: description?.trim() || '',
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate,
        assignedTo,
        position,
      });

      // Dispatch Automation Event
      AutomationEngine.dispatchEvent('TASK_CREATED', {
        workflowId,
        task,
        user: req.user,
      });

      res.status(201).json({ success: true, data: task });
    } catch (err) {
      console.error('[Create Task Error]:', err);
      res.status(400).json({ success: false, error: err.message || 'Failed to create task' });
    }
  },

  // GET /api/tasks/:id/document
  async getTaskDocument(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const task = req.task || (await SupabaseService.getTaskById(id));
      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      if (!task.documentId) {
        return res.status(404).json({ success: false, error: 'No document attached to this task' });
      }

      const result = await SupabaseService.getDocumentDownloadUrl(task.documentId, userId);
      return res.json({
        success: true,
        downloadUrl: result.url,
        data: result.doc,
      });
    } catch (err) {
      console.error('[Get Task Document Error]:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to get document' });
    }
  },

  // PUT /api/tasks/:id
  async updateTask(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const updates = { ...req.body };

      const existing = req.task || (await SupabaseService.getTaskById(id));
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }

      // Role check: Allow update if user is Team Admin/Manager, Workflow Owner/Manager, or Task Creator
      const workflow = await SupabaseService.getWorkflowById(existing.workflowId);
      const isWorkflowOwnerOrMgr = workflow && (
        workflow.createdBy === userId ||
        workflow.ownerId === userId ||
        workflow.userRole === 'OWNER' ||
        workflow.userRole === 'MANAGER'
      );
      const teamRole = req.teamRole || (existing.teamId ? await SupabaseService.getTeamMemberRole(existing.teamId, userId) : null);
      const isManagerOrAdmin = teamRole === 'TEAM_ADMIN' || teamRole === 'TEAM_MANAGER' || isWorkflowOwnerOrMgr || existing.createdBy === userId;

      if (!isManagerOrAdmin) {
        // Team member without manager rights can only change status or update description
        if (updates.assignedTo && updates.assignedTo !== existing.assignedTo) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Only Team Admins and Managers can reassign tasks.',
          });
        }
        if (updates.priority && updates.priority !== existing.priority) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Only Team Admins and Managers can alter task priority.',
          });
        }
        if (updates.dueDate && updates.dueDate !== existing.dueDate) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Only Team Admins and Managers can modify due dates.',
          });
        }
      }

      // Mandatory validation if marking task as COMPLETED
      if (updates.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        const completionText = (updates.completionDescription || updates.description || '').trim();
        const words = completionText.split(/\s+/).filter(Boolean);
        if (words.length < 15) {
          return res.status(400).json({
            success: false,
            error: `A completion description of at least 15 words is required to mark this task as completed (current count: ${words.length} words).`,
          });
        }

        if (!req.file && !existing.documentId && !updates.documentId) {
          return res.status(400).json({
            success: false,
            error: 'A supporting document (.pdf, .doc, .docx) is mandatory to mark this task as completed.',
          });
        }

        updates.completionDescription = completionText;
      }

      // If file was attached (via multer memoryStorage)
      if (req.file) {
        const uploadedDoc = await SupabaseService.saveWorkflowDocument({
          workflowId: existing.workflowId || 'general',
          file: req.file,
          uploadedBy: userId,
          description: updates.completionDescription || `Deliverable for task "${existing.title}"`,
        });
        updates.documentId = uploadedDoc.id;
        updates.documentName = uploadedDoc.fileName;
        updates.attachment = uploadedDoc;
      }

      const updated = await SupabaseService.updateTask(id, updates, userId);

      // Trigger Automations when task status changes or task completes
      if (updates.status && updates.status !== existing.status) {
        if (updates.status === 'COMPLETED') {
          AutomationEngine.dispatchEvent('TASK_COMPLETED', {
            workflowId: updated.workflowId,
            task: updated,
            user: req.user,
            previousState: existing,
          });
        }

        AutomationEngine.dispatchEvent('TASK_STATUS_CHANGED', {
          workflowId: updated.workflowId,
          task: updated,
          user: req.user,
          previousState: existing,
        });
      }

      res.json({ success: true, data: updated });
    } catch (err) {
      console.error('[Update Task Error]:', err);
      res.status(400).json({ success: false, error: err.message || 'Failed to update task' });
    }
  },

  // DELETE /api/tasks/:id
  async deleteTask(req, res) {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      await SupabaseService.deleteTask(id, userId);
      res.json({ success: true, message: 'Task deleted successfully' });
    } catch (err) {
      console.error('[Delete Task Error]:', err);
      res.status(400).json({ success: false, error: err.message || 'Failed to delete task' });
    }
  },
};

module.exports = taskController;
