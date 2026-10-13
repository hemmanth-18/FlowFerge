const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/auth');
const rbac = require('../middleware/rbacMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.csv', '.xlsx', '.xls', '.zip', '.ppt', '.pptx'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid format: Only PDF, Word, Excel, CSV, PPT, TXT, images, and ZIP files are accepted.'));
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

// Tasks query (supports teamId & mine=true)
router.get('/', taskController.getAllTasks);

// Single Task Operations (Protected by requireTaskAccess)
router.get('/:id', rbac.requireTaskAccess('view'), taskController.getTaskById);
router.get('/:id/document', rbac.requireTaskAccess('view'), taskController.getTaskDocument);
router.put('/:id', rbac.requireTaskAccess('update'), uploadSingleFile, taskController.updateTask);
router.delete('/:id', rbac.requireTaskAccess('delete'), taskController.deleteTask);

module.exports = router;
