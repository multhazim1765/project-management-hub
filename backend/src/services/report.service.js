const { Project, Task, TimeEntry, Issue, Milestone, User } = require('../models');
const { TASK_STATUS } = require('../config/constants');

class ReportService {
  /**
   * Generate project progress report
   */
  async getProjectProgressReport(projectId, options = {}) {
    const project = await Project.findById(projectId)
      .populate('createdBy', 'firstName lastName email')
      .populate('members.userId', 'firstName lastName email');

    if (!project) {
      throw new Error('Project not found');
    }

    // Get task statistics
    const taskStats = await Task.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          estimatedHours: { $sum: '$estimatedHours' },
          actualHours: { $sum: '$actualHours' },
        },
      },
    ]);

    const totalTasks = taskStats.reduce((sum, stat) => sum + stat.count, 0);
    const completedTasks = taskStats.find((s) => s._id === TASK_STATUS.CLOSED)?.count || 0;
    const totalEstimatedHours = taskStats.reduce((sum, stat) => sum + (stat.estimatedHours || 0), 0);
    const totalActualHours = taskStats.reduce((sum, stat) => sum + (stat.actualHours || 0), 0);

    // Get milestone progress
    const milestones = await Milestone.find({ projectId })
      .populate('taskCount')
      .populate('completedTaskCount')
      .sort({ order: 1 });

    // Get time entries summary
    const timeEntrySummary = await TimeEntry.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$hours' },
          billableHours: {
            $sum: { $cond: ['$billable', '$hours', 0] },
          },
          totalAmount: {
            $sum: {
              $cond: [
                '$billable',
                { $multiply: ['$hours', { $ifNull: ['$billingRate', 0] }] },
                0,
              ],
            },
          },
        },
      },
    ]);

    // Get issue summary
    const issueSummary = await Issue.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get team member contributions
    const memberContributions = await TimeEntry.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id: '$userId',
          totalHours: { $sum: '$hours' },
          billableHours: {
            $sum: { $cond: ['$billable', '$hours', 0] },
          },
        },
      },
      { $sort: { totalHours: -1 } },
      { $limit: 10 },
    ]);

    // Populate user details
    const memberIds = memberContributions.map((m) => m._id);
    const members = await User.find({ _id: { $in: memberIds } }).select(
      'firstName lastName email avatar'
    );

    const memberContributionsWithDetails = memberContributions.map((contrib) => {
      const user = members.find((m) => m._id.toString() === contrib._id.toString());
      return {
        user,
        totalHours: contrib.totalHours,
        billableHours: contrib.billableHours,
      };
    });

    // Calculate progress percentage
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate schedule variance
    let scheduleStatus = 'on-track';
    if (project.endDate) {
      const now = new Date();
      const totalDuration = project.endDate - project.startDate;
      const elapsedDuration = now - project.startDate;
      const expectedProgress = (elapsedDuration / totalDuration) * 100;

      if (progressPercentage < expectedProgress - 10) {
        scheduleStatus = 'behind';
      } else if (progressPercentage > expectedProgress + 10) {
        scheduleStatus = 'ahead';
      }
    }

    return {
      project: {
        id: project._id,
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        createdBy: project.createdBy,
        memberCount: project.members.length,
      },
      summary: {
        totalTasks,
        completedTasks,
        progressPercentage,
        totalEstimatedHours,
        totalActualHours,
        scheduleStatus,
      },
      tasksByStatus: taskStats.map((stat) => ({
        status: stat._id,
        count: stat.count,
        estimatedHours: stat.estimatedHours || 0,
        actualHours: stat.actualHours || 0,
      })),
      milestones: milestones.map((m) => ({
        id: m._id,
        name: m.name,
        dueDate: m.dueDate,
        status: m.status,
        taskCount: m.taskCount || 0,
        completedTaskCount: m.completedTaskCount || 0,
      })),
      timeTracking: timeEntrySummary[0] || {
        totalHours: 0,
        billableHours: 0,
        totalAmount: 0,
      },
      issues: {
        total: issueSummary.reduce((sum, s) => sum + s.count, 0),
        byStatus: issueSummary,
      },
      topContributors: memberContributionsWithDetails,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate time utilization report
   */
  async getTimeUtilizationReport(filters = {}) {
    const { organizationId, projectId, userId, startDate, endDate } = filters;

    const matchQuery = {};

    if (organizationId) {
      const projects = await Project.find({ organizationId }).select('_id');
      matchQuery.projectId = { $in: projects.map((p) => p._id) };
    }

    if (projectId) {
      matchQuery.projectId = projectId;
    }

    if (userId) {
      matchQuery.userId = userId;
    }

    if (startDate && endDate) {
      matchQuery.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Daily breakdown
    const dailyBreakdown = await TimeEntry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalHours: { $sum: '$hours' },
          billableHours: { $sum: { $cond: ['$billable', '$hours', 0] } },
          entryCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // By project
    const byProject = await TimeEntry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$projectId',
          totalHours: { $sum: '$hours' },
          billableHours: { $sum: { $cond: ['$billable', '$hours', 0] } },
          entryCount: { $sum: 1 },
        },
      },
      { $sort: { totalHours: -1 } },
    ]);

    // Populate project details
    const projectIds = byProject.map((p) => p._id);
    const projects = await Project.find({ _id: { $in: projectIds } }).select('name key');

    const byProjectWithDetails = byProject.map((proj) => {
      const project = projects.find((p) => p._id.toString() === proj._id.toString());
      return {
        project,
        totalHours: proj.totalHours,
        billableHours: proj.billableHours,
        entryCount: proj.entryCount,
      };
    });

    // By user
    const byUser = await TimeEntry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$userId',
          totalHours: { $sum: '$hours' },
          billableHours: { $sum: { $cond: ['$billable', '$hours', 0] } },
          entryCount: { $sum: 1 },
        },
      },
      { $sort: { totalHours: -1 } },
    ]);

    // Populate user details
    const userIds = byUser.map((u) => u._id);
    const users = await User.find({ _id: { $in: userIds } }).select(
      'firstName lastName email avatar jobTitle'
    );

    const byUserWithDetails = byUser.map((userStat) => {
      const user = users.find((u) => u._id.toString() === userStat._id.toString());
      return {
        user,
        totalHours: userStat.totalHours,
        billableHours: userStat.billableHours,
        entryCount: userStat.entryCount,
      };
    });

    // Overall summary
    const overallSummary = await TimeEntry.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$hours' },
          billableHours: { $sum: { $cond: ['$billable', '$hours', 0] } },
          totalAmount: {
            $sum: {
              $cond: [
                '$billable',
                { $multiply: ['$hours', { $ifNull: ['$billingRate', 0] }] },
                0,
              ],
            },
          },
          entryCount: { $sum: 1 },
        },
      },
    ]);

    return {
      summary: overallSummary[0] || {
        totalHours: 0,
        billableHours: 0,
        totalAmount: 0,
        entryCount: 0,
      },
      dailyBreakdown,
      byProject: byProjectWithDetails,
      byUser: byUserWithDetails,
      filters: {
        startDate,
        endDate,
        projectId,
        userId,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Generate task metrics report
   */
  async getTaskMetricsReport(projectId, options = {}) {
    const { startDate, endDate } = options;

    const matchQuery = { projectId };

    if (startDate && endDate) {
      matchQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Tasks by priority
    const byPriority = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.CLOSED] }, 1, 0] },
          },
          avgEstimatedHours: { $avg: '$estimatedHours' },
          avgActualHours: { $avg: '$actualHours' },
        },
      },
    ]);

    // Tasks by status
    const byStatus = await Task.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEstimatedHours: { $sum: '$estimatedHours' },
          totalActualHours: { $sum: '$actualHours' },
        },
      },
    ]);

    // Tasks by assignee
    const byAssignee = await Task.aggregate([
      { $match: matchQuery },
      { $unwind: { path: '$assigneeIds', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$assigneeIds',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.CLOSED] }, 1, 0] },
          },
          totalEstimatedHours: { $sum: '$estimatedHours' },
          totalActualHours: { $sum: '$actualHours' },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { totalTasks: -1 } },
    ]);

    // Populate assignee details
    const assigneeIds = byAssignee.map((a) => a._id);
    const assignees = await User.find({ _id: { $in: assigneeIds } }).select(
      'firstName lastName email avatar'
    );

    const byAssigneeWithDetails = byAssignee.map((stat) => {
      const user = assignees.find((u) => u._id.toString() === stat._id.toString());
      return {
        user,
        totalTasks: stat.totalTasks,
        completedTasks: stat.completedTasks,
        completionRate:
          stat.totalTasks > 0
            ? Math.round((stat.completedTasks / stat.totalTasks) * 100)
            : 0,
        totalEstimatedHours: stat.totalEstimatedHours || 0,
        totalActualHours: stat.totalActualHours || 0,
      };
    });

    // Completion trends (daily)
    const completionTrends = await Task.aggregate([
      {
        $match: {
          projectId,
          completedAt: startDate && endDate
            ? { $gte: new Date(startDate), $lte: new Date(endDate) }
            : { $exists: true },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Average completion time
    const avgCompletionTime = await Task.aggregate([
      {
        $match: {
          projectId,
          status: TASK_STATUS.CLOSED,
          completedAt: { $exists: true },
        },
      },
      {
        $project: {
          completionTime: {
            $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$completionTime' },
        },
      },
    ]);

    // Overdue tasks
    const overdueTasks = await Task.countDocuments({
      projectId,
      status: { $ne: TASK_STATUS.CLOSED },
      dueDate: { $lt: new Date() },
    });

    return {
      summary: {
        totalTasks: await Task.countDocuments(matchQuery),
        completedTasks: await Task.countDocuments({
          ...matchQuery,
          status: TASK_STATUS.CLOSED,
        }),
        overdueTasks,
        avgCompletionTimeDays: avgCompletionTime[0]?.avgDays || 0,
      },
      byPriority,
      byStatus,
      byAssignee: byAssigneeWithDetails,
      completionTrends,
      filters: {
        startDate,
        endDate,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Generate burndown chart data
   */
  async getBurndownData(projectId, milestoneId = null) {
    const matchQuery = { projectId };
    if (milestoneId) {
      matchQuery.milestoneId = milestoneId;
    }

    const tasks = await Task.find(matchQuery).select(
      'estimatedHours actualHours completedAt createdAt'
    );

    const milestone = milestoneId
      ? await Milestone.findById(milestoneId)
      : await Project.findById(projectId).select('startDate endDate');

    if (!milestone) {
      throw new Error('Milestone or project not found');
    }

    const startDate = milestone.startDate || milestone.createdAt;
    const endDate = milestone.dueDate || milestone.endDate;

    // Calculate ideal burndown
    const totalEstimatedHours = tasks.reduce(
      (sum, task) => sum + (task.estimatedHours || 0),
      0
    );

    const burndownData = [];
    const currentDate = new Date();
    const daysBetween = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    for (let i = 0; i <= daysBetween; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const idealRemaining =
        totalEstimatedHours - (totalEstimatedHours / daysBetween) * i;

      const completedByDate = tasks.filter(
        (task) => task.completedAt && task.completedAt <= date
      );
      const actualCompleted = completedByDate.reduce(
        (sum, task) => sum + (task.estimatedHours || 0),
        0
      );
      const actualRemaining = totalEstimatedHours - actualCompleted;

      burndownData.push({
        date: date.toISOString().split('T')[0],
        idealRemaining: Math.max(0, idealRemaining),
        actualRemaining: date <= currentDate ? actualRemaining : null,
      });
    }

    return {
      burndownData,
      totalEstimatedHours,
      startDate,
      endDate,
      generatedAt: new Date(),
    };
  }
}

module.exports = new ReportService();
