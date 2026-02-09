const express = require('express');
const router = express.Router();
const { projectController, taskController, milestoneController, issueController, timeEntryController, commentController, dashboardController } = require('../controllers');
const {
  authenticate,
  authorizeRoles,
  authorizeProjectAccess,
  authorizeProjectManage,
  validate,
  validateObjectId,
} = require('../middleware');
const { ROLES } = require('../config/constants');
const {
  createProjectValidator,
  updateProjectValidator,
  addMemberValidator,
  listProjectsValidator,
  createFromTemplateValidator,
} = require('../validators');

// All routes require authentication
router.use(authenticate);

// Project templates
router.get('/templates', projectController.getTemplates);
router.post('/templates', projectController.createTemplate);

// Create project from template
router.post('/from-template', projectController.createFromTemplate);

// Project CRUD
router.post('/', projectController.createProject);
router.get('/', projectController.getProjects);
router.get('/:id', validateObjectId('id'), projectController.getProject);
router.put('/:id', validateObjectId('id'), projectController.updateProject);
router.delete('/:id', validateObjectId('id'), projectController.deleteProject);

// Project actions
router.post('/:id/archive', validateObjectId('id'), projectController.archiveProject);
router.post('/:id/restore', validateObjectId('id'), projectController.restoreProject);
router.post('/:id/duplicate', validateObjectId('id'), projectController.duplicateProject);

// Project members
router.get('/:id/members', validateObjectId('id'), projectController.getMembers);
router.post('/:id/members', validateObjectId('id'), projectController.addMember);
router.delete('/:id/members/:userId', validateObjectId('id'), projectController.removeMember);

// Project dashboard
router.get('/:projectId/dashboard', validateObjectId('projectId'), dashboardController.getProjectDashboard);

// Tasks
router.post('/:projectId/tasks', validateObjectId('projectId'), taskController.createTask);
router.get('/:projectId/tasks', validateObjectId('projectId'), taskController.getTasks);
router.put('/:projectId/tasks/bulk', validateObjectId('projectId'), taskController.bulkUpdate);

// Labels
router.post('/:projectId/labels', validateObjectId('projectId'), taskController.createLabel);
router.get('/:projectId/labels', validateObjectId('projectId'), taskController.getLabels);

// Milestones
router.post('/:projectId/milestones', validateObjectId('projectId'), milestoneController.createMilestone);
router.get('/:projectId/milestones', validateObjectId('projectId'), milestoneController.getMilestones);
router.put('/:projectId/milestones/reorder', validateObjectId('projectId'), milestoneController.reorderMilestones);

// Issues
router.post('/:projectId/issues', validateObjectId('projectId'), issueController.createIssue);
router.get('/:projectId/issues', validateObjectId('projectId'), issueController.getIssues);
router.get('/:projectId/issues/stats', validateObjectId('projectId'), issueController.getIssueStats);

// Discussions
router.post('/:projectId/discussions', validateObjectId('projectId'), commentController.createDiscussion);
router.get('/:projectId/discussions', validateObjectId('projectId'), commentController.getDiscussions);

// Time report
router.get('/:projectId/time-report', validateObjectId('projectId'), timeEntryController.getProjectTimeReport);

module.exports = router;
