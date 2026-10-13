const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const workflowController = require('../controllers/workflowController');
const taskController = require('../controllers/taskController');
const graphController = require('../controllers/graphController');
const authMiddleware = require('../middleware/auth');
const rbac = require('../middleware/rbacMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.pdf', '.doc', '.docx'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid format: Only PDF, DOC, and DOCX documents are accepted.'));
    }
  },
});

const uploadSingleFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

router.use(authMiddleware);

// Workflows list & create
router.get('/', workflowController.getWorkflows);
router.post('/', workflowController.createWorkflow);

// Single Workflow operations (protected by rbac)
router.get('/:id', rbac.requireWorkflowAccess(), workflowController.getWorkflowById);
router.put('/:id', rbac.requireWorkflowManager(), workflowController.updateWorkflow);
router.delete('/:id', rbac.requireWorkflowOwner(), workflowController.deleteWorkflow);

// Status Lifecycle Transition (with optional / mandatory attachments)
router.put('/:id/status', rbac.requireWorkflowManager(), uploadSingleFile, workflowController.updateWorkflowStatus);

// Shared Workflow Documents (Section 11)
router.get('/:id/documents', rbac.requireWorkflowAccess(), workflowController.getWorkflowDocuments);
router.post('/:id/documents', rbac.requireWorkflowAccess(), uploadSingleFile, workflowController.uploadWorkflowDocument);
router.get('/:id/documents/:docId/download', rbac.requireWorkflowAccess(), workflowController.downloadWorkflowDocument);
router.delete('/:id/documents/:docId', rbac.requireWorkflowManager(), workflowController.deleteWorkflowDocument);

// Duplication & Sharing (Section 5, 9)
router.post('/:id/duplicate', rbac.requireWorkflowAccess(), workflowController.duplicateWorkflow);
router.post('/:id/share', rbac.requireWorkflowManager(), workflowController.shareWorkflow);

// Graph DAG Canvas Endpoints
router.get('/:id/graph', rbac.requireWorkflowAccess(), graphController.getWorkflowGraph);
router.put('/:id/graph', rbac.requireWorkflowAccess(), graphController.saveWorkflowGraph);

// Workflow Granular Members & Roles
router.get('/:id/members', rbac.requireWorkflowAccess(), workflowController.getWorkflowMembers);
router.get('/:id/invitations', rbac.requireWorkflowAccess(), workflowController.getWorkflowInvitations);
router.post('/:id/members', rbac.requireWorkflowManager(), workflowController.addWorkflowMember);
router.put('/:id/members/:userId', rbac.requireWorkflowManager(), workflowController.updateWorkflowMemberRole);
router.put('/:id/members/:userId/role', rbac.requireWorkflowManager(), workflowController.updateWorkflowMemberRole);
router.delete('/:id/members/:userId', rbac.requireWorkflowManager(), workflowController.removeWorkflowMember);

// Workflow Tasks Nesting
router.get('/:workflowId/tasks', rbac.requireWorkflowAccess(), taskController.getTasksByWorkflow);
router.post('/:workflowId/tasks', rbac.requireWorkflowAccess(), taskController.createTask);

module.exports = router;
