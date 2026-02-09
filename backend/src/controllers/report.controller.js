const reportService = require('../services/report.service');
const pdfGenerator = require('../utils/pdfGenerator');
const csvExporter = require('../utils/csvExporter');
const { Task, TimeEntry, Issue, Project } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const logger = require('../utils/logger');

/**
 * @desc    Get project progress report
 * @route   GET /api/reports/project-progress/:projectId
 * @access  Private (Project Member)
 */
const getProjectProgress = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const reportData = await reportService.getProjectProgressReport(projectId);

  ApiResponse.success(res, { report: reportData }, 'Report generated');
});

/**
 * @desc    Get time utilization report
 * @route   GET /api/reports/time-utilization
 * @access  Private
 */
const getTimeUtilization = asyncHandler(async (req, res) => {
  const { projectId, userId, startDate, endDate } = req.query;

  const filters = {
    organizationId: req.organizationId,
    projectId,
    userId,
    startDate,
    endDate,
  };

  const reportData = await reportService.getTimeUtilizationReport(filters);

  ApiResponse.success(res, { report: reportData }, 'Report generated');
});

/**
 * @desc    Get task metrics report
 * @route   GET /api/reports/task-metrics/:projectId
 * @access  Private (Project Member)
 */
const getTaskMetrics = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { startDate, endDate } = req.query;

  const reportData = await reportService.getTaskMetricsReport(projectId, {
    startDate,
    endDate,
  });

  ApiResponse.success(res, { report: reportData }, 'Report generated');
});

/**
 * @desc    Get burndown chart data
 * @route   GET /api/reports/burndown/:projectId
 * @access  Private (Project Member)
 */
const getBurndown = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { milestoneId } = req.query;

  const reportData = await reportService.getBurndownData(projectId, milestoneId);

  ApiResponse.success(res, { report: reportData }, 'Burndown data generated');
});

/**
 * @desc    Export project progress report to PDF
 * @route   GET /api/reports/project-progress/:projectId/pdf
 * @access  Private (Project Member)
 */
const exportProjectProgressPDF = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const reportData = await reportService.getProjectProgressReport(projectId);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="project-progress-${reportData.project.name.replace(/\s+/g, '-')}.pdf"`
  );

  pdfGenerator.generateProjectProgressPDF(reportData, res);
});

/**
 * @desc    Export time utilization report to PDF
 * @route   GET /api/reports/time-utilization/pdf
 * @access  Private
 */
const exportTimeUtilizationPDF = asyncHandler(async (req, res) => {
  const { projectId, userId, startDate, endDate } = req.query;

  const filters = {
    organizationId: req.organizationId,
    projectId,
    userId,
    startDate,
    endDate,
  };

  const reportData = await reportService.getTimeUtilizationReport(filters);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="time-utilization-report.pdf"'
  );

  pdfGenerator.generateTimeUtilizationPDF(reportData, res);
});

/**
 * @desc    Export task metrics report to PDF
 * @route   GET /api/reports/task-metrics/:projectId/pdf
 * @access  Private (Project Member)
 */
const exportTaskMetricsPDF = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { startDate, endDate } = req.query;

  const reportData = await reportService.getTaskMetricsReport(projectId, {
    startDate,
    endDate,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="task-metrics-report.pdf"');

  pdfGenerator.generateTaskMetricsPDF(reportData, res);
});

/**
 * @desc    Export project progress report to CSV
 * @route   GET /api/reports/project-progress/:projectId/csv
 * @access  Private (Project Member)
 */
const exportProjectProgressCSV = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const reportData = await reportService.getProjectProgressReport(projectId);

  const csv = csvExporter.exportProjectProgressCSV(reportData);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="project-progress-${reportData.project.name.replace(/\s+/g, '-')}.csv"`
  );

  res.send(csv);
});

/**
 * @desc    Export time utilization report to CSV
 * @route   GET /api/reports/time-utilization/csv
 * @access  Private
 */
const exportTimeUtilizationCSV = asyncHandler(async (req, res) => {
  const { projectId, userId, startDate, endDate } = req.query;

  const filters = {
    organizationId: req.organizationId,
    projectId,
    userId,
    startDate,
    endDate,
  };

  const reportData = await reportService.getTimeUtilizationReport(filters);

  const csv = csvExporter.exportTimeUtilizationCSV(reportData);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="time-utilization-report.csv"'
  );

  res.send(csv);
});

/**
 * @desc    Export task metrics report to CSV
 * @route   GET /api/reports/task-metrics/:projectId/csv
 * @access  Private (Project Member)
 */
const exportTaskMetricsCSV = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { startDate, endDate } = req.query;

  const reportData = await reportService.getTaskMetricsReport(projectId, {
    startDate,
    endDate,
  });

  const csv = csvExporter.exportTaskMetricsCSV(reportData);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="task-metrics-report.csv"');

  res.send(csv);
});

/**
 * @desc    Export time entries to CSV
 * @route   GET /api/reports/time-entries/csv
 * @access  Private
 */
const exportTimeEntriesCSV = asyncHandler(async (req, res) => {
  const { projectId, userId, startDate, endDate } = req.query;

  const query = { organizationId: req.organizationId };

  if (projectId) query.projectId = projectId;
  if (userId) query.userId = userId;
  if (startDate && endDate) {
    query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  const timeEntries = await TimeEntry.find(query)
    .populate('userId', 'firstName lastName email')
    .populate('projectId', 'name key')
    .populate('taskId', 'title taskNumber')
    .sort({ date: -1 })
    .limit(5000);

  const csv = csvExporter.exportTimeEntriesCSV(timeEntries);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="time-entries.csv"');

  res.send(csv);
});

/**
 * @desc    Export tasks to CSV
 * @route   GET /api/reports/tasks/:projectId/csv
 * @access  Private (Project Member)
 */
const exportTasksCSV = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, assigneeId } = req.query;

  const query = { projectId };

  if (status) query.status = status;
  if (assigneeId) query.assigneeIds = assigneeId;

  const tasks = await Task.find(query)
    .populate('assigneeIds', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });

  const csv = csvExporter.exportTasksCSV(tasks);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"');

  res.send(csv);
});

/**
 * @desc    Export issues to CSV
 * @route   GET /api/reports/issues/:projectId/csv
 * @access  Private (Project Member)
 */
const exportIssuesCSV = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, severity } = req.query;

  const query = { projectId };

  if (status) query.status = status;
  if (severity) query.severity = severity;

  const issues = await Issue.find(query)
    .populate('reportedBy', 'firstName lastName email')
    .populate('assigneeId', 'firstName lastName email')
    .sort({ createdAt: -1 });

  const csv = csvExporter.exportIssuesCSV(issues);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="issues.csv"');

  res.send(csv);
});

/**
 * @desc    Export projects to CSV
 * @route   GET /api/reports/projects/csv
 * @access  Private
 */
const exportProjectsCSV = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const query = { organizationId: req.organizationId };

  if (status) query.status = status;

  const projects = await Project.find(query)
    .populate('createdBy', 'firstName lastName')
    .populate('members.userId', 'firstName lastName')
    .sort({ createdAt: -1 });

  const csv = csvExporter.exportProjectsCSV(projects);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="projects.csv"');

  res.send(csv);
});

module.exports = {
  getProjectProgress,
  getTimeUtilization,
  getTaskMetrics,
  getBurndown,
  exportProjectProgressPDF,
  exportTimeUtilizationPDF,
  exportTaskMetricsPDF,
  exportProjectProgressCSV,
  exportTimeUtilizationCSV,
  exportTaskMetricsCSV,
  exportTimeEntriesCSV,
  exportTasksCSV,
  exportIssuesCSV,
  exportProjectsCSV,
};
