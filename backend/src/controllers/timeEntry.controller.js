const { TimeEntry, Timer, Task, Project } = require('../models');
const { notificationService } = require('../services');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const { getPagination, getWeekRange } = require('../utils/helpers');

/**
 * @desc    Create time entry
 * @route   POST /api/time-entries
 * @access  Private
 */
const createTimeEntry = asyncHandler(async (req, res) => {
  const { taskId, projectId, date, hours, description, billable, tags } = req.body;

  // Verify project access
  const project = await Project.findOne({
    _id: projectId,
    'members.userId': req.userId,
  });

  if (!project) {
    return ApiResponse.forbidden(res, 'You are not a member of this project');
  }

  const timeEntry = new TimeEntry({
    userId: req.userId,
    taskId,
    projectId,
    date,
    hours,
    description,
    billable: billable !== false,
    tags,
  });

  await timeEntry.save();

  // Update task actual hours if linked
  if (taskId) {
    await Task.findByIdAndUpdate(taskId, { $inc: { actualHours: hours } });
  }

  await timeEntry.populate([
    { path: 'projectId', select: 'name key' },
    { path: 'taskId', select: 'title taskNumber' },
  ]);

  ApiResponse.created(res, { timeEntry }, 'Time entry created');
});

/**
 * @desc    Get time entries
 * @route   GET /api/time-entries
 * @access  Private
 */
const getTimeEntries = asyncHandler(async (req, res) => {
  const { projectId, taskId, startDate, endDate, page = 1, limit = 20 } = req.query;

  const query = { userId: req.userId };

  if (projectId) query.projectId = projectId;
  if (taskId) query.taskId = taskId;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const total = await TimeEntry.countDocuments(query);
  const pagination = getPagination(page, limit, total);

  const timeEntries = await TimeEntry.find(query)
    .populate('projectId', 'name key')
    .populate('taskId', 'title taskNumber')
    .sort({ date: -1 })
    .skip(pagination.skip)
    .limit(pagination.perPage);

  ApiResponse.paginated(res, { timeEntries }, pagination);
});

/**
 * @desc    Get my time entries
 * @route   GET /api/time-entries/my-entries
 * @access  Private
 */
const getMyTimeEntries = asyncHandler(async (req, res) => {
  const { startDate, endDate, projectId, limit = 50 } = req.query;

  const query = { userId: req.userId };

  if (projectId) query.projectId = projectId;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const timeEntries = await TimeEntry.find(query)
    .populate('projectId', 'name key')
    .populate('taskId', 'title taskKey')
    .sort({ date: -1 })
    .limit(parseInt(limit));

  // Calculate duration in minutes for each entry (hours * 60)
  const entriesWithDuration = timeEntries.map((entry) => ({
    ...entry.toObject(),
    duration: entry.hours ? Math.round(entry.hours * 60) : 0,
  }));

  ApiResponse.success(res, { timeEntries: entriesWithDuration });
});

/**
 * @desc    Get single time entry
 * @route   GET /api/time-entries/:id
 * @access  Private
 */
const getTimeEntry = asyncHandler(async (req, res) => {
  const timeEntry = await TimeEntry.findOne({
    _id: req.params.id,
    userId: req.userId,
  })
    .populate('projectId', 'name key')
    .populate('taskId', 'title taskNumber')
    .populate('approvedBy', 'firstName lastName');

  if (!timeEntry) {
    return ApiResponse.notFound(res, 'Time entry not found');
  }

  ApiResponse.success(res, { timeEntry });
});

/**
 * @desc    Update time entry
 * @route   PUT /api/time-entries/:id
 * @access  Private
 */
const updateTimeEntry = asyncHandler(async (req, res) => {
  const timeEntry = await TimeEntry.findOne({
    _id: req.params.id,
    userId: req.userId,
    status: 'pending',
  });

  if (!timeEntry) {
    return ApiResponse.notFound(res, 'Time entry not found or already approved');
  }

  const { date, hours, description, billable, tags } = req.body;
  const oldHours = timeEntry.hours;

  if (date) timeEntry.date = date;
  if (hours) timeEntry.hours = hours;
  if (description !== undefined) timeEntry.description = description;
  if (billable !== undefined) timeEntry.billable = billable;
  if (tags) timeEntry.tags = tags;

  await timeEntry.save();

  // Update task actual hours
  if (timeEntry.taskId && hours !== oldHours) {
    await Task.findByIdAndUpdate(timeEntry.taskId, {
      $inc: { actualHours: hours - oldHours },
    });
  }

  await timeEntry.populate([
    { path: 'projectId', select: 'name key' },
    { path: 'taskId', select: 'title taskNumber' },
  ]);

  ApiResponse.success(res, { timeEntry }, 'Time entry updated');
});

/**
 * @desc    Delete time entry
 * @route   DELETE /api/time-entries/:id
 * @access  Private
 */
const deleteTimeEntry = asyncHandler(async (req, res) => {
  const timeEntry = await TimeEntry.findOne({
    _id: req.params.id,
    userId: req.userId,
    status: 'pending',
  });

  if (!timeEntry) {
    return ApiResponse.notFound(res, 'Time entry not found or already approved');
  }

  // Update task actual hours
  if (timeEntry.taskId) {
    await Task.findByIdAndUpdate(timeEntry.taskId, {
      $inc: { actualHours: -timeEntry.hours },
    });
  }

  await timeEntry.deleteOne();

  ApiResponse.success(res, null, 'Time entry deleted');
});

/**
 * @desc    Start timer
 * @route   POST /api/timers/start
 * @access  Private
 */
const startTimer = asyncHandler(async (req, res) => {
  const { taskId, projectId, description, billable } = req.body;

  // Check for existing running timer
  const existingTimer = await Timer.getActiveTimer(req.userId);
  if (existingTimer) {
    return ApiResponse.conflict(res, 'You already have a running timer');
  }

  // Verify project access
  const project = await Project.findOne({
    _id: projectId,
    'members.userId': req.userId,
  });

  if (!project) {
    return ApiResponse.forbidden(res, 'You are not a member of this project');
  }

  const timer = new Timer({
    userId: req.userId,
    taskId,
    projectId,
    description,
    billable: billable !== false,
    startTime: new Date(),
  });

  await timer.save();

  await timer.populate([
    { path: 'projectId', select: 'name key' },
    { path: 'taskId', select: 'title taskNumber' },
  ]);

  ApiResponse.created(res, { timer }, 'Timer started');
});

/**
 * @desc    Stop timer
 * @route   POST /api/timers/stop
 * @access  Private
 */
const stopTimer = asyncHandler(async (req, res) => {
  const timer = await Timer.getActiveTimer(req.userId);
  if (!timer) {
    return ApiResponse.notFound(res, 'No active timer found');
  }

  const { description } = req.body;
  if (description) {
    timer.description = description;
  }

  const result = await timer.stop();

  // Update task actual hours if time entry was created
  if (result.timeEntry && timer.taskId) {
    await Task.findByIdAndUpdate(timer.taskId, {
      $inc: { actualHours: result.timeEntry.hours },
    });
  }

  ApiResponse.success(res, result, 'Timer stopped');
});

/**
 * @desc    Pause timer
 * @route   POST /api/timers/pause
 * @access  Private
 */
const pauseTimer = asyncHandler(async (req, res) => {
  const timer = await Timer.getActiveTimer(req.userId);
  if (!timer) {
    return ApiResponse.notFound(res, 'No active timer found');
  }

  await timer.pause();

  await timer.populate([
    { path: 'projectId', select: 'name key' },
    { path: 'taskId', select: 'title taskNumber' },
  ]);

  ApiResponse.success(res, { timer }, 'Timer paused');
});

/**
 * @desc    Resume timer
 * @route   POST /api/timers/resume
 * @access  Private
 */
const resumeTimer = asyncHandler(async (req, res) => {
  const timer = await Timer.getActiveTimer(req.userId);
  if (!timer) {
    return ApiResponse.notFound(res, 'No paused timer found');
  }

  await timer.resume();

  await timer.populate([
    { path: 'projectId', select: 'name key' },
    { path: 'taskId', select: 'title taskNumber' },
  ]);

  ApiResponse.success(res, { timer }, 'Timer resumed');
});

/**
 * @desc    Get active timer
 * @route   GET /api/timers/active
 * @access  Private
 */
const getActiveTimer = asyncHandler(async (req, res) => {
  const timer = await Timer.getActiveTimer(req.userId);

  ApiResponse.success(res, { timer });
});

/**
 * @desc    Get weekly timesheet
 * @route   GET /api/timesheets/weekly
 * @access  Private
 */
const getWeeklyTimesheet = asyncHandler(async (req, res) => {
  const { date } = req.query;
  const { startOfWeek, endOfWeek } = getWeekRange(date ? new Date(date) : new Date());

  const timesheet = await TimeEntry.getWeeklyTimesheet(req.userId, startOfWeek, endOfWeek);

  // Calculate totals
  const totals = {
    totalHours: 0,
    billableHours: 0,
    nonBillableHours: 0,
    entriesByDay: {},
  };

  timesheet.forEach((item) => {
    totals.totalHours += item.totalHours;
    totals.billableHours += item.billableHours;

    item.entries.forEach((entry) => {
      const day = new Date(entry.date).toISOString().split('T')[0];
      if (!totals.entriesByDay[day]) {
        totals.entriesByDay[day] = 0;
      }
      totals.entriesByDay[day] += entry.hours;
    });
  });

  totals.nonBillableHours = totals.totalHours - totals.billableHours;

  ApiResponse.success(res, {
    timesheet,
    totals,
    weekRange: { start: startOfWeek, end: endOfWeek },
  });
});

/**
 * @desc    Approve time entries
 * @route   PUT /api/time-entries/approve
 * @access  Private (Project Manager+)
 */
const approveTimeEntries = asyncHandler(async (req, res) => {
  const { entryIds, action, rejectedReason } = req.body;

  const status = action === 'approve' ? 'approved' : 'rejected';

  const updateData = {
    status,
    approvedBy: req.userId,
    approvedAt: new Date(),
  };

  if (status === 'rejected' && rejectedReason) {
    updateData.rejectedReason = rejectedReason;
  }

  await TimeEntry.updateMany({ _id: { $in: entryIds } }, updateData);

  // Notify users
  const entries = await TimeEntry.find({ _id: { $in: entryIds } })
    .populate('userId', 'firstName lastName')
    .populate('projectId', 'name');

  const userIds = [...new Set(entries.map((e) => e.userId._id.toString()))];

  for (const userId of userIds) {
    const userEntries = entries.filter((e) => e.userId._id.toString() === userId);
    await notificationService.notifyTimesheetApproval(
      userId,
      req.user,
      status,
      userEntries[0].projectId.name
    );
  }

  ApiResponse.success(res, { count: entryIds.length }, `Time entries ${status}`);
});

/**
 * @desc    Get pending approvals
 * @route   GET /api/time-entries/pending-approvals
 * @access  Private (Project Manager+)
 */
const getPendingApprovals = asyncHandler(async (req, res) => {
  // Get projects where user is manager
  const projects = await Project.find({
    organizationId: req.organizationId,
    'members.userId': req.userId,
    'members.role': { $in: ['project_manager', 'project_admin'] },
  });

  const projectIds = projects.map((p) => p._id);

  const pendingEntries = await TimeEntry.getPendingApprovals(projectIds);

  ApiResponse.success(res, { pendingEntries });
});

/**
 * @desc    Get time entry report for project
 * @route   GET /api/projects/:projectId/time-report
 * @access  Private (Project Member)
 */
const getProjectTimeReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  const summary = await TimeEntry.getProjectSummary(req.params.projectId, start, end);

  // Calculate totals
  const totals = summary.reduce(
    (acc, item) => ({
      totalHours: acc.totalHours + item.totalHours,
      billableHours: acc.billableHours + item.billableHours,
      entryCount: acc.entryCount + item.entryCount,
    }),
    { totalHours: 0, billableHours: 0, entryCount: 0 }
  );

  ApiResponse.success(res, { summary, totals });
});

module.exports = {
  createTimeEntry,
  getTimeEntries,
  getMyTimeEntries,
  getTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  startTimer,
  stopTimer,
  pauseTimer,
  resumeTimer,
  getActiveTimer,
  getWeeklyTimesheet,
  approveTimeEntries,
  getPendingApprovals,
  getProjectTimeReport,
};
