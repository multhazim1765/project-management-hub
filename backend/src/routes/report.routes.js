const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const {
  authenticate,
  authorizeProjectAccess,
  validateObjectId,
} = require('../middleware');

// All routes require authentication
router.use(authenticate);

// ============ Report Generation ============

// Project progress report
router.get(
  '/project-progress/:projectId',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  reportController.getProjectProgress
);

// Time utilization report
router.get('/time-utilization', reportController.getTimeUtilization);

// Task metrics report
router.get(
  '/task-metrics/:projectId',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  reportController.getTaskMetrics
);

// Burndown chart data
router.get(
  '/burndown/:projectId',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  reportController.getBurndown
);

// ============ PDF Exports ============

// Export project progress to PDF
router.get(
  '/project-progress/:projectId/pdf',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  reportController.exportProjectProgressPDF
);

// Export time utilization to PDF
router.get('/time-utilization/pdf', reportController.exportTimeUtilizationPDF);

// Export task metrics to PDF
router.get(
  '/task-metrics/:projectId/pdf',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  reportController.exportTaskMetricsPDF
);

// ============ CSV Exports ============

// Export project progress to CSV
router.get(
  '/project-progress/:projectId/csv',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  reportController.exportProjectProgressCSV
);

// Export time utilization to CSV
router.get('/time-utilization/csv', reportController.exportTimeUtilizationCSV);

// Export task metrics to CSV
router.get(
  '/task-metrics/:projectId/csv',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  reportController.exportTaskMetricsCSV
);

// Export time entries to CSV
router.get('/time-entries/csv', reportController.exportTimeEntriesCSV);

// Export tasks to CSV
router.get(
  '/tasks/:projectId/csv',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  reportController.exportTasksCSV
);

// Export issues to CSV
router.get(
  '/issues/:projectId/csv',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  reportController.exportIssuesCSV
);

// Export projects to CSV
router.get('/projects/csv', reportController.exportProjectsCSV);

module.exports = router;
