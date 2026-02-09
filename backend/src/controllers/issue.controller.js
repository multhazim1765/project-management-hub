const { Issue, Project, User } = require('../models');
const { notificationService } = require('../services');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const { getPagination } = require('../utils/helpers');

/**
 * @desc    Create issue
 * @route   POST /api/projects/:projectId/issues
 * @access  Private (Project Member)
 */
const createIssue = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    title,
    description,
    severity,
    priority,
    issueType,
    reproducible,
    stepsToReproduce,
    expectedBehavior,
    actualBehavior,
    environment,
    assignedTo,
    labels,
    dueDate,
    estimatedHours,
  } = req.body;

  const issue = new Issue({
    title,
    description,
    projectId,
    severity,
    priority,
    issueType,
    reproducible,
    stepsToReproduce,
    expectedBehavior,
    actualBehavior,
    environment,
    assignedTo,
    labels,
    dueDate,
    estimatedHours,
    reportedBy: req.userId,
    watchers: [req.userId],
  });

  await issue.save();

  await issue.populate([
    { path: 'reportedBy', select: 'firstName lastName email avatar' },
    { path: 'assignedTo', select: 'firstName lastName email avatar' },
  ]);

  // Notify assignee
  if (assignedTo) {
    const project = await Project.findById(projectId);
    const assignee = await User.findById(assignedTo);
    await notificationService.notifyIssueAssignment(issue, assignee, req.user, project);
  }

  ApiResponse.created(res, { issue }, 'Issue created');
});

/**
 * @desc    Get issues for project
 * @route   GET /api/projects/:projectId/issues
 * @access  Private (Project Member)
 */
const getIssues = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    status,
    severity,
    priority,
    issueType,
    assignedTo,
    reportedBy,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const { issues, total } = await Issue.getByProject(projectId, {
    status,
    severity,
    priority,
    issueType,
    assignedTo,
    reportedBy,
    search,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder: sortOrder === 'asc' ? 1 : -1,
  });

  const pagination = getPagination(page, limit, total);

  ApiResponse.paginated(res, { issues }, pagination);
});

/**
 * @desc    Get single issue
 * @route   GET /api/issues/:id
 * @access  Private (Project Member)
 */
const getIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id)
    .populate('reportedBy', 'firstName lastName email avatar')
    .populate('assignedTo', 'firstName lastName email avatar')
    .populate('resolvedBy', 'firstName lastName')
    .populate('closedBy', 'firstName lastName')
    .populate('reopenedBy', 'firstName lastName')
    .populate('linkedTaskId', 'title taskNumber status')
    .populate('duplicateOf', 'title issueNumber')
    .populate('watchers', 'firstName lastName email avatar')
    .populate('attachments');

  if (!issue) {
    return ApiResponse.notFound(res, 'Issue not found');
  }

  // Get project info
  const project = await Project.findById(issue.projectId).select('name key');

  ApiResponse.success(res, {
    issue: {
      ...issue.toObject(),
      project: { _id: project._id, name: project.name, key: project.key },
    },
  });
});

/**
 * @desc    Update issue
 * @route   PUT /api/issues/:id
 * @access  Private (Project Member)
 */
const updateIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return ApiResponse.notFound(res, 'Issue not found');
  }

  const allowedFields = [
    'title',
    'description',
    'severity',
    'priority',
    'issueType',
    'reproducible',
    'stepsToReproduce',
    'expectedBehavior',
    'actualBehavior',
    'environment',
    'labels',
    'dueDate',
    'estimatedHours',
    'affectedVersion',
    'fixedInVersion',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      issue[field] = req.body[field];
    }
  });

  await issue.save();

  await issue.populate([
    { path: 'reportedBy', select: 'firstName lastName email avatar' },
    { path: 'assignedTo', select: 'firstName lastName email avatar' },
  ]);

  ApiResponse.success(res, { issue }, 'Issue updated');
});

/**
 * @desc    Delete issue
 * @route   DELETE /api/issues/:id
 * @access  Private (Project Manager+)
 */
const deleteIssue = asyncHandler(async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return ApiResponse.notFound(res, 'Issue not found');
  }

  await issue.deleteOne();

  ApiResponse.success(res, null, 'Issue deleted');
});

/**
 * @desc    Assign issue
 * @route   PUT /api/issues/:id/assign
 * @access  Private (Project Member)
 */
const assignIssue = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;

  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return ApiResponse.notFound(res, 'Issue not found');
  }

  await issue.assign(assignedTo, req.userId);

  await issue.populate('assignedTo', 'firstName lastName email avatar');

  // Notify assignee
  if (assignedTo && assignedTo.toString() !== req.userId.toString()) {
    const project = await Project.findById(issue.projectId);
    const assignee = await User.findById(assignedTo);
    await notificationService.notifyIssueAssignment(issue, assignee, req.user, project);
  }

  ApiResponse.success(res, { issue }, 'Issue assigned');
});

/**
 * @desc    Update issue status
 * @route   PUT /api/issues/:id/status
 * @access  Private (Project Member)
 */
const updateIssueStatus = asyncHandler(async (req, res) => {
  const { status, resolution, resolutionNotes } = req.body;

  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return ApiResponse.notFound(res, 'Issue not found');
  }

  if (status === 'resolved') {
    await issue.resolve(req.userId, resolution, resolutionNotes);
  } else if (status === 'closed') {
    await issue.close(req.userId);
  } else if (status === 'reopened') {
    await issue.reopen(req.userId);
  } else {
    issue.status = status;
    await issue.save();
  }

  await issue.populate([
    { path: 'reportedBy', select: 'firstName lastName email avatar' },
    { path: 'assignedTo', select: 'firstName lastName email avatar' },
    { path: 'resolvedBy', select: 'firstName lastName' },
  ]);

  ApiResponse.success(res, { issue }, 'Issue status updated');
});

/**
 * @desc    Link issue to task
 * @route   PUT /api/issues/:id/link-task
 * @access  Private (Project Member)
 */
const linkTask = asyncHandler(async (req, res) => {
  const { taskId } = req.body;

  const issue = await Issue.findByIdAndUpdate(
    req.params.id,
    { linkedTaskId: taskId },
    { new: true }
  ).populate('linkedTaskId', 'title taskNumber status');

  if (!issue) {
    return ApiResponse.notFound(res, 'Issue not found');
  }

  ApiResponse.success(res, { issue }, 'Task linked to issue');
});

/**
 * @desc    Mark as duplicate
 * @route   PUT /api/issues/:id/duplicate
 * @access  Private (Project Member)
 */
const markDuplicate = asyncHandler(async (req, res) => {
  const { duplicateOfId } = req.body;

  const issue = await Issue.findById(req.params.id);
  if (!issue) {
    return ApiResponse.notFound(res, 'Issue not found');
  }

  issue.duplicateOf = duplicateOfId;
  issue.status = 'closed';
  issue.resolution = 'duplicate';
  issue.closedAt = new Date();
  issue.closedBy = req.userId;

  await issue.save();

  await issue.populate('duplicateOf', 'title issueNumber');

  ApiResponse.success(res, { issue }, 'Issue marked as duplicate');
});

/**
 * @desc    Get issue statistics
 * @route   GET /api/projects/:projectId/issues/stats
 * @access  Private (Project Member)
 */
const getIssueStats = asyncHandler(async (req, res) => {
  const stats = await Issue.getStatistics(req.params.projectId);

  ApiResponse.success(res, { stats: stats[0] || {} });
});

/**
 * @desc    Watch issue
 * @route   POST /api/issues/:id/watch
 * @access  Private (Project Member)
 */
const watchIssue = asyncHandler(async (req, res) => {
  await Issue.findByIdAndUpdate(req.params.id, {
    $addToSet: { watchers: req.userId },
  });

  ApiResponse.success(res, null, 'Now watching issue');
});

/**
 * @desc    Unwatch issue
 * @route   DELETE /api/issues/:id/watch
 * @access  Private (Project Member)
 */
const unwatchIssue = asyncHandler(async (req, res) => {
  await Issue.findByIdAndUpdate(req.params.id, {
    $pull: { watchers: req.userId },
  });

  ApiResponse.success(res, null, 'Stopped watching issue');
});

module.exports = {
  createIssue,
  getIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  assignIssue,
  updateIssueStatus,
  linkTask,
  markDuplicate,
  getIssueStats,
  watchIssue,
  unwatchIssue,
};
