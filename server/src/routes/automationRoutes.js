const express = require('express');
const router = express.Router();
const automationController = require('../controllers/automationController');
const authMiddleware = require('../middleware/auth');
const rbac = require('../middleware/rbacMiddleware');

router.use(authMiddleware);

// Global list
router.get('/', automationController.getAllAutomations);

// Workflow-scoped routes
router.get('/workflow/:workflowId', rbac.requireWorkflowAccess(), automationController.getWorkflowAutomations);
router.post('/workflow/:workflowId', rbac.requireWorkflowAccess(), rbac.requireAutomationAccess(), automationController.createAutomation);
router.get('/workflow/:workflowId/logs', rbac.requireWorkflowAccess(), automationController.getAutomationLogs);

// Individual rule actions
router.put('/:id', rbac.requireAutomationAccess(), automationController.updateAutomation);
router.delete('/:id', rbac.requireAutomationAccess(), automationController.deleteAutomation);

module.exports = router;
