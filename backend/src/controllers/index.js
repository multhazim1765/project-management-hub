const authController = require('./auth.controller');
const projectController = require('./project.controller');
const taskController = require('./task.controller');
const milestoneController = require('./milestone.controller');
const timeEntryController = require('./timeEntry.controller');
const commentController = require('./comment.controller');
const issueController = require('./issue.controller');
const dashboardController = require('./dashboard.controller');
const notificationController = require('./notification.controller');
const documentController = require('./document.controller');
const folderController = require('./folder.controller');
const reportController = require('./report.controller');
const organizationController = require('./organization.controller');
const phaseController = require('./phase.controller');

module.exports = {
  authController,
  projectController,
  taskController,
  milestoneController,
  timeEntryController,
  commentController,
  issueController,
  dashboardController,
  notificationController,
  documentController,
  folderController,
  reportController,
  organizationController,
  phaseController,
};
