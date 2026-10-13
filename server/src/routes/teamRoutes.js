const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/auth');
const rbac = require('../middleware/rbacMiddleware');

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

module.exports = router;
