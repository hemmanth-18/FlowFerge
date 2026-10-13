const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const teamController = require('../controllers/teamController');
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

// All team endpoints require authentication
router.use(authMiddleware);

// User Profile & User's Teams
router.get('/profile/me', teamController.getMyProfile);
router.get('/all-users', teamController.getAllUsers);
router.get('/', teamController.getUserTeams);
router.post('/', teamController.createTeam);

// Invitations (User-centric)
router.get('/invitations/my', teamController.getMyInvitations);
router.post('/invitations/:invitationId/accept', teamController.acceptInvitation);
router.post('/invitations/:invitationId/decline', teamController.declineInvitation);

// Team-scoped operations (Protected by requireTeamMember, requireTeamManager, requireTeamAdmin)
router.get('/:teamId', rbac.requireTeamMember(), teamController.getTeamById);
router.put('/:teamId', rbac.requireTeamAdmin(), teamController.updateTeam);
router.delete('/:teamId', rbac.requireTeamAdmin(), teamController.archiveTeam);

// Team Dashboard & Members
router.get('/:teamId/dashboard', rbac.requireTeamMember(), teamController.getTeamDashboard);
router.get('/:teamId/members', rbac.requireTeamMember(), teamController.getTeamMembers);
router.put('/:teamId/members/:userId/role', rbac.requireTeamAdmin(), teamController.updateMemberRole);
router.delete('/:teamId/members/:userId', rbac.requireTeamAdmin(), teamController.removeMember);

// Team Invitations
router.get('/:teamId/invitations', rbac.requireTeamManager(), teamController.getTeamInvitations);
router.post('/:teamId/invitations', rbac.requireTeamManager(), teamController.createInvitation);
router.post('/:teamId/invitations/:invitationId/resend', rbac.requireTeamManager(), teamController.resendInvitation);
router.delete('/:teamId/invitations/:invitationId', rbac.requireTeamManager(), teamController.cancelInvitation);

// Team Activity & Audit
router.get('/:teamId/activity', rbac.requireTeamMember(), teamController.getTeamActivity);
router.get('/:teamId/audit', rbac.requireTeamManager(), teamController.getTeamAudit);

// Team Tasks (Manager View)
router.get('/:teamId/tasks', rbac.requireTeamManager(), teamController.getTeamTasks);

// Team Templates
router.get('/:teamId/templates', rbac.requireTeamMember(), teamController.getTeamTemplates);
router.post('/:teamId/templates/:templateId/instantiate', rbac.requireTeamManager(), teamController.instantiateTemplate);

// Scoped Search
router.get('/:teamId/search', rbac.requireTeamMember(), teamController.searchTeam);

// Team Workflow Documents (Admins & Managers can send documents to workflows)
router.get('/:teamId/documents', rbac.requireTeamMember(), teamController.getTeamDocuments);
router.post('/:teamId/documents', rbac.requireTeamManager(), uploadSingleFile, teamController.sendTeamDocumentToWorkflows);

module.exports = router;
