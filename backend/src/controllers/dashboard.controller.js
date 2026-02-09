const { Project, Task, Milestone, Issue, TimeEntry, User, Organization } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const { ROLES, TASK_STATUS, PROJECT_STATUS, ISSUE_STATUS } = require('../config/constants');
const { getWeekRange } = require('../utils/helpers');

/**
 * @desc    Get super admin dashboard
 * @route   GET /api/dashboard/admin
 * @access  Private (Super Admin)
 */
const getAdminDashboard = asyncHandler(async (req, res) => {
  const organizationId = req.organizationId;

  // Get organization info
  const organization = await Organization.findById(organizationId);

  // Get counts
  const [projectCount, userCount, activeUserCount] = await Promise.all([
    Project.countDocuments({ organizationId, status: { $ne: PROJECT_STATUS.ARCHIVED } }),
    User.countDocuments({ organizationId }),
    User.countDocuments({ organizationId, status: 'active' }),
  ]);

  // Get project status distribution
  const projectStats = await Project.aggregate([
    { $match: { organizationId: organization._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Get recent activities (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const recentProjects = await Project.find({
    organizationId,
    createdAt: { $gte: oneWeekAgo },
  })
    .select('name status createdAt')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get storage usage
  const storageUsed = organization.storageUsed;
  const storageLimit = organization.billingInfo.maxStorage;

  ApiResponse.success(res, {
    organization: {
      name: organization.name,
      plan: organization.billingInfo.plan,
      maxUsers: organization.billingInfo.maxUsers,
      maxProjects: organization.billingInfo.maxProjects,
    },
    stats: {
      totalProjects: projectCount,
      totalUsers: userCount,
      activeUsers: activeUserCount,
      projectsByStatus: projectStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    },
    storage: {
      used: storageUsed,
      limit: storageLimit,
      percentage: Math.round((storageUsed / storageLimit) * 100),
    },
    recentProjects,
  });
});

/**
 * @desc    Get project admin dashboard
 * @route   GET /api/dashboard/project-admin
 * @access  Private (Project Admin+)
 */
const getProjectAdminDashboard = asyncHandler(async (req, res) => {
  const organizationId = req.organizationId;

  // Get all projects
  const projects = await Project.find({
    organizationId,
    status: { $ne: PROJECT_STATUS.ARCHIVED },
  })
    .select('name status priority members createdAt')
    .populate('members.userId', 'firstName lastName avatar')
    .sort({ updatedAt: -1 });

  // Get project status distribution
  const statusDistribution = await Project.aggregate([
    { $match: { organizationId, status: { $ne: PROJECT_STATUS.ARCHIVED } } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Get team utilization (hours logged this week)
  const { startOfWeek, endOfWeek } = getWeekRange();

  const teamUtilization = await TimeEntry.aggregate([
    {
      $match: {
        date: { $gte: startOfWeek, $lte: endOfWeek },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $match: { 'user.organizationId': organizationId } },
    {
      $group: {
        _id: '$userId',
        totalHours: { $sum: '$hours' },
        userName: { $first: { $concat: ['$user.firstName', ' ', '$user.lastName'] } },
      },
    },
    { $sort: { totalHours: -1 } },
    { $limit: 10 },
  ]);

  // Recent activities
  const recentTasks = await Task.find({
    projectId: { $in: projects.map((p) => p._id) },
    updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  })
    .populate('projectId', 'name')
    .populate('assigneeIds', 'firstName lastName')
    .select('title status updatedAt projectId')
    .sort({ updatedAt: -1 })
    .limit(10);

  ApiResponse.success(res, {
    projects,
    statusDistribution: statusDistribution.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    teamUtilization,
    recentActivities: recentTasks,
  });
});

/**
 * @desc    Get project manager dashboard
 * @route   GET /api/dashboard/project-manager
 * @access  Private (Project Manager+)
 */
const getProjectManagerDashboard = asyncHandler(async (req, res) => {
  // Get projects where user is manager
  const projects = await Project.find({
    organizationId: req.organizationId,
    'members.userId': req.userId,
    status: { $ne: PROJECT_STATUS.ARCHIVED },
  }).select('name status members startDate endDate');

  const projectIds = projects.map((p) => p._id);

  // Get task statistics
  const taskStats = await Task.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // Get overdue tasks
  const overdueTasks = await Task.find({
    projectId: { $in: projectIds },
    dueDate: { $lt: new Date() },
    status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] },
  })
    .populate('projectId', 'name key')
    .populate('assigneeIds', 'firstName lastName avatar')
    .sort({ dueDate: 1 })
    .limit(10);

  // Get upcoming milestones (next 14 days)
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 14);

  const upcomingMilestones = await Milestone.find({
    projectId: { $in: projectIds },
    dueDate: { $lte: upcomingDate },
    status: { $ne: 'completed' },
  })
    .populate('projectId', 'name')
    .sort({ dueDate: 1 })
    .limit(5);

  // Calculate milestone progress
  for (const milestone of upcomingMilestones) {
    await milestone.calculateProgress();
  }

  // Get team workload
  const teamWorkload = await Task.aggregate([
    {
      $match: {
        projectId: { $in: projectIds },
        status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] },
      },
    },
    { $unwind: '$assigneeIds' },
    {
      $group: {
        _id: '$assigneeIds',
        taskCount: { $sum: 1 },
        totalEstimatedHours: { $sum: '$estimatedHours' },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
        avatar: '$user.avatar',
        taskCount: 1,
        totalEstimatedHours: 1,
      },
    },
    { $sort: { taskCount: -1 } },
  ]);

  // Project health indicators
  const projectHealth = projects.map((project) => {
    const overdue = overdueTasks.filter(
      (t) => t.projectId._id.toString() === project._id.toString()
    ).length;

    let health = 'on-track';
    if (overdue > 5) health = 'delayed';
    else if (overdue > 0) health = 'at-risk';

    return {
      _id: project._id,
      name: project.name,
      status: project.status,
      health,
      overdueCount: overdue,
    };
  });

  // Get open issues count
  const openIssues = await Issue.countDocuments({
    projectId: { $in: projectIds },
    status: { $in: [ISSUE_STATUS.OPEN, ISSUE_STATUS.IN_PROGRESS, ISSUE_STATUS.REOPENED] },
  });

  ApiResponse.success(res, {
    projects: projectHealth,
    taskStats: taskStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    overdueTasks,
    upcomingMilestones,
    teamWorkload,
    openIssues,
  });
});

/**
 * @desc    Get team member dashboard
 * @route   GET /api/dashboard/team-member
 * @access  Private
 */
const getTeamMemberDashboard = asyncHandler(async (req, res) => {
  // Get assigned tasks
  const myTasks = await Task.find({
    assigneeIds: req.userId,
    status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] },
  })
    .populate('projectId', 'name key')
    .sort({ dueDate: 1, priority: -1 })
    .limit(10);

  // Add task keys
  const tasksWithKey = myTasks.map((task) => ({
    ...task.toObject(),
    taskKey: `${task.projectId.key}-${task.taskNumber}`,
  }));

  // Get today's deadlines
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysTasks = await Task.find({
    assigneeIds: req.userId,
    dueDate: { $gte: today, $lt: tomorrow },
    status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] },
  })
    .populate('projectId', 'name key')
    .sort({ priority: -1 });

  // Get overdue tasks
  const overdueTasks = await Task.find({
    assigneeIds: req.userId,
    dueDate: { $lt: today },
    status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] },
  })
    .populate('projectId', 'name key')
    .select('title dueDate priority projectId taskNumber');

  // Get time logged this week
  const { startOfWeek, endOfWeek } = getWeekRange();

  const weeklyTime = await TimeEntry.aggregate([
    {
      $match: {
        userId: req.userId,
        date: { $gte: startOfWeek, $lte: endOfWeek },
      },
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' },
        billableHours: { $sum: { $cond: ['$billable', '$hours', 0] } },
      },
    },
  ]);

  // Get pending timesheet approvals
  const pendingTimesheets = await TimeEntry.countDocuments({
    userId: req.userId,
    status: 'pending',
  });

  // Get my projects
  const myProjects = await Project.find({
    'members.userId': req.userId,
    status: { $ne: PROJECT_STATUS.ARCHIVED },
  }).select('name status key color');

  // Recent activity (tasks I completed recently)
  const recentCompleted = await Task.find({
    assigneeIds: req.userId,
    status: { $in: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] },
    completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  })
    .populate('projectId', 'name key')
    .sort({ completedAt: -1 })
    .limit(5);

  // Task statistics
  const taskStats = await Task.aggregate([
    { $match: { assigneeIds: req.userId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  ApiResponse.success(res, {
    myTasks: tasksWithKey,
    todaysTasks,
    overdueTasks,
    weeklyTime: weeklyTime[0] || { totalHours: 0, billableHours: 0 },
    pendingTimesheets,
    myProjects,
    recentCompleted,
    taskStats: taskStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
  });
});

/**
 * @desc    Get project dashboard
 * @route   GET /api/projects/:projectId/dashboard
 * @access  Private (Project Member)
 */
const getProjectDashboard = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  // Get project info
  const project = await Project.findById(projectId)
    .populate('members.userId', 'firstName lastName avatar email');

  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  // Task statistics
  const taskStats = await Task.aggregate([
    { $match: { projectId: project._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEstimated: { $sum: '$estimatedHours' },
        totalActual: { $sum: '$actualHours' },
      },
    },
  ]);

  // Priority distribution
  const priorityStats = await Task.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  // Milestone progress
  const milestones = await Milestone.find({ projectId }).sort({ dueDate: 1 });
  for (const milestone of milestones) {
    await milestone.calculateProgress();
  }

  // Recent tasks
  const recentTasks = await Task.find({ projectId })
    .populate('assigneeIds', 'firstName lastName avatar')
    .sort({ updatedAt: -1 })
    .limit(5);

  // Overdue count
  const overdueCount = await Task.countDocuments({
    projectId,
    dueDate: { $lt: new Date() },
    status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] },
  });

  // Issue statistics
  const issueStats = await Issue.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Time tracked
  const timeStats = await TimeEntry.aggregate([
    { $match: { projectId: project._id } },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$hours' },
        billableHours: { $sum: { $cond: ['$billable', '$hours', 0] } },
      },
    },
  ]);

  // Calculate overall progress
  const totalTasks = taskStats.reduce((sum, s) => sum + s.count, 0);
  const completedTasks = taskStats.find((s) => s._id === TASK_STATUS.COMPLETED)?.count || 0;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  ApiResponse.success(res, {
    project: {
      _id: project._id,
      name: project.name,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      memberCount: project.members.length,
    },
    progress,
    taskStats: {
      byStatus: taskStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      byPriority: priorityStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      total: totalTasks,
      overdue: overdueCount,
    },
    milestones: milestones.map((m) => ({
      _id: m._id,
      name: m.name,
      dueDate: m.dueDate,
      status: m.status,
      progress: m._progress,
    })),
    issueStats: issueStats.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {}),
    timeStats: timeStats[0] || { totalHours: 0, billableHours: 0 },
    recentTasks,
  });
});

module.exports = {
  getAdminDashboard,
  getProjectAdminDashboard,
  getProjectManagerDashboard,
  getTeamMemberDashboard,
  getProjectDashboard,
};
