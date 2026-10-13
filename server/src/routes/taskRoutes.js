const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/auth');
const rbac = require('../middleware/rbacMiddleware');

router.use(authMiddleware);

// Tasks query (supports teamId & mine=true)
router.get('/', taskController.getAllTasks);

// Single Task Operations (Protected by requireTaskAccess)
router.get('/:id', rbac.requireTaskAccess('view'), taskController.getTaskById);
router.put('/:id', rbac.requireTaskAccess('update'), taskController.updateTask);
router.delete('/:id', rbac.requireTaskAccess('delete'), taskController.deleteTask);

module.exports = router;
