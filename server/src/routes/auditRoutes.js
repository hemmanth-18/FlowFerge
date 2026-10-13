const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/auth');
const rbac = require('../middleware/rbacMiddleware');

router.use(authMiddleware);

// Team Audit Logs (Controlled within auditController by team role)
router.get('/', auditController.getAuditLogs);
router.get('/workflow/:workflowId', rbac.requireWorkflowAccess(), auditController.getWorkflowAuditLogs);

module.exports = router;
