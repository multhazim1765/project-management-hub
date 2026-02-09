const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const projectRoutes = require('./project.routes');
const taskRoutes = require('./task.routes');
const documentRoutes = require('./document.routes');
const reportRoutes = require('./report.routes');
const organizationRoutes = require('./organization.routes');
const phaseRoutes = require('./phase.routes');

const { milestoneController, timeEntryController, commentController, issueController, dashboardController, notificationController, authController } = require('../controllers');
const { authenticate, authorizeRoles, validateObjectId, authorizeProjectManage } = require('../middleware');
const { ROLES } = require('../config/constants');
const { inviteUserValidator } = require('../validators');
const { validate } = require('../middleware');

// API routes
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/', documentRoutes); // Documents and folders
router.use('/reports', reportRoutes);
router.use('/organizations', organizationRoutes);
router.use('/', phaseRoutes); // Phases

// Milestones (direct access)
router.get('/milestones/:id', authenticate, validateObjectId('id'), milestoneController.getMilestone);
router.put('/milestones/:id', authenticate, validateObjectId('id'), milestoneController.updateMilestone);
router.delete('/milestones/:id', authenticate, validateObjectId('id'), milestoneController.deleteMilestone);
router.get('/milestones/:id/tasks', authenticate, validateObjectId('id'), milestoneController.getMilestoneTasks);

// Time entries
router.post('/time-entries', authenticate, timeEntryController.createTimeEntry);
router.get('/time-entries', authenticate, timeEntryController.getTimeEntries);
router.get('/time-entries/my-entries', authenticate, timeEntryController.getMyTimeEntries);
router.get('/time-entries/pending-approvals', authenticate, timeEntryController.getPendingApprovals);
router.get('/time-entries/:id', authenticate, validateObjectId('id'), timeEntryController.getTimeEntry);
router.put('/time-entries/:id', authenticate, validateObjectId('id'), timeEntryController.updateTimeEntry);
router.delete('/time-entries/:id', authenticate, validateObjectId('id'), timeEntryController.deleteTimeEntry);
router.put('/time-entries/approve', authenticate, timeEntryController.approveTimeEntries);

// Timers
router.get('/timers/active', authenticate, timeEntryController.getActiveTimer);
router.post('/timers/start', authenticate, timeEntryController.startTimer);
router.post('/timers/stop', authenticate, timeEntryController.stopTimer);
router.post('/timers/pause', authenticate, timeEntryController.pauseTimer);
router.post('/timers/resume', authenticate, timeEntryController.resumeTimer);

// Timesheets
router.get('/timesheets/weekly', authenticate, timeEntryController.getWeeklyTimesheet);

// Comments
router.post('/comments', authenticate, commentController.createComment);
router.get('/comments', authenticate, commentController.getComments);
router.put('/comments/:id', authenticate, validateObjectId('id'), commentController.updateComment);
router.delete('/comments/:id', authenticate, validateObjectId('id'), commentController.deleteComment);
router.post('/comments/:id/reactions', authenticate, validateObjectId('id'), commentController.addReaction);
router.delete('/comments/:id/reactions/:emoji', authenticate, validateObjectId('id'), commentController.removeReaction);

// Discussions
router.get('/discussions/:id', authenticate, validateObjectId('id'), commentController.getDiscussion);
router.put('/discussions/:id', authenticate, validateObjectId('id'), commentController.updateDiscussion);
router.delete('/discussions/:id', authenticate, validateObjectId('id'), commentController.deleteDiscussion);

// Issues
router.get('/issues/:id', authenticate, validateObjectId('id'), issueController.getIssue);
router.put('/issues/:id', authenticate, validateObjectId('id'), issueController.updateIssue);
router.delete('/issues/:id', authenticate, validateObjectId('id'), issueController.deleteIssue);
router.put('/issues/:id/assign', authenticate, validateObjectId('id'), issueController.assignIssue);
router.put('/issues/:id/status', authenticate, validateObjectId('id'), issueController.updateIssueStatus);
router.put('/issues/:id/link-task', authenticate, validateObjectId('id'), issueController.linkTask);
router.put('/issues/:id/duplicate', authenticate, validateObjectId('id'), issueController.markDuplicate);
router.post('/issues/:id/watch', authenticate, validateObjectId('id'), issueController.watchIssue);
router.delete('/issues/:id/watch', authenticate, validateObjectId('id'), issueController.unwatchIssue);

// Labels
router.delete('/labels/:id', authenticate, validateObjectId('id'), require('../controllers').taskController.deleteLabel);

// Organizations
router.post('/organizations/:id/invite', authenticate, authController.inviteUser);
router.get('/organizations/:id/invitations', authenticate, authController.getPendingInvitations);
router.delete('/invitations/:id', authenticate, authController.revokeInvitation);

// Dashboards
router.get('/dashboard/admin', authenticate, dashboardController.getAdminDashboard);
router.get('/dashboard/project-admin', authenticate, dashboardController.getProjectAdminDashboard);
router.get('/dashboard/project-manager', authenticate, dashboardController.getProjectManagerDashboard);
router.get('/dashboard/team-member', authenticate, dashboardController.getTeamMemberDashboard);

// Notifications
router.get('/notifications', authenticate, notificationController.getNotifications);
router.get('/notifications/unread-count', authenticate, notificationController.getUnreadCount);
router.put('/notifications/:id/read', authenticate, validateObjectId('id'), notificationController.markAsRead);
router.put('/notifications/read-all', authenticate, notificationController.markAllAsRead);
router.delete('/notifications/:id', authenticate, validateObjectId('id'), notificationController.deleteNotification);

// Notification preferences
router.get('/notification-preferences', authenticate, notificationController.getPreferences);
router.put('/notification-preferences', authenticate, notificationController.updatePreferences);
router.put('/notification-preferences/:type', authenticate, notificationController.updateTypeSetting);
router.post('/notification-preferences/projects/:projectId/toggle', authenticate, validateObjectId('projectId'), notificationController.toggleProjectMute);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
