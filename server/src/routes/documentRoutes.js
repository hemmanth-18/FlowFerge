const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/auth');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format: Only PDF (.pdf) and Word documents (.doc, .docx) are supported.'));
    }
  },
});

const uploadSingle = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

router.use(authMiddleware);

// Document Listing Views
router.get('/', documentController.getDocuments);
router.get('/received', documentController.getReceivedDocuments);
router.get('/my', documentController.getMyDocuments);

// Eligible Workflow Recipients
router.get('/workflows/:workflowId/recipients', documentController.getWorkflowRecipients);

// Send / Share Document
router.post('/send', uploadSingle, documentController.sendDocument);

// Operations on Single Document
router.get('/:id/download', documentController.downloadDocument);
router.get('/:id/preview', documentController.previewDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
