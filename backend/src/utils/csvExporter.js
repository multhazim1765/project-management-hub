const { Parser } = require('json2csv');
const { format } = require('date-fns');

class CSVExporter {
  /**
   * Export project progress report to CSV
   */
  exportProjectProgressCSV(reportData) {
    const data = [];

    // Project info
    data.push({
      Section: 'Project Info',
      Key: 'Name',
      Value: reportData.project.name,
    });
    data.push({
      Section: 'Project Info',
      Key: 'Status',
      Value: reportData.project.status,
    });
    data.push({
      Section: 'Project Info',
      Key: 'Member Count',
      Value: reportData.project.memberCount,
    });

    // Summary
    data.push({
      Section: 'Summary',
      Key: 'Total Tasks',
      Value: reportData.summary.totalTasks,
    });
    data.push({
      Section: 'Summary',
      Key: 'Completed Tasks',
      Value: reportData.summary.completedTasks,
    });
    data.push({
      Section: 'Summary',
      Key: 'Progress',
      Value: `${reportData.summary.progressPercentage}%`,
    });
    data.push({
      Section: 'Summary',
      Key: 'Total Estimated Hours',
      Value: reportData.summary.totalEstimatedHours.toFixed(1),
    });
    data.push({
      Section: 'Summary',
      Key: 'Total Actual Hours',
      Value: reportData.summary.totalActualHours.toFixed(1),
    });

    // Tasks by status
    reportData.tasksByStatus.forEach((stat) => {
      data.push({
        Section: 'Tasks by Status',
        Key: stat.status,
        Value: `Count: ${stat.count}, Est: ${stat.estimatedHours}h, Actual: ${stat.actualHours}h`,
      });
    });

    // Top contributors
    reportData.topContributors.forEach((contrib) => {
      data.push({
        Section: 'Top Contributors',
        Key: `${contrib.user.firstName} ${contrib.user.lastName}`,
        Value: `Total: ${contrib.totalHours.toFixed(1)}h, Billable: ${contrib.billableHours.toFixed(1)}h`,
      });
    });

    const fields = ['Section', 'Key', 'Value'];
    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  /**
   * Export time utilization report to CSV
   */
  exportTimeUtilizationCSV(reportData) {
    const data = [];

    // Summary
    data.push({
      Section: 'Summary',
      Metric: 'Total Hours',
      Value: reportData.summary.totalHours.toFixed(1),
    });
    data.push({
      Section: 'Summary',
      Metric: 'Billable Hours',
      Value: reportData.summary.billableHours.toFixed(1),
    });
    data.push({
      Section: 'Summary',
      Metric: 'Total Amount',
      Value: reportData.summary.totalAmount.toFixed(2),
    });
    data.push({
      Section: 'Summary',
      Metric: 'Entry Count',
      Value: reportData.summary.entryCount,
    });

    // Daily breakdown
    reportData.dailyBreakdown.forEach((day) => {
      data.push({
        Section: 'Daily Breakdown',
        Metric: day._id,
        Value: `Total: ${day.totalHours.toFixed(1)}h, Billable: ${day.billableHours.toFixed(1)}h`,
      });
    });

    // By project
    reportData.byProject.forEach((proj) => {
      data.push({
        Section: 'By Project',
        Metric: proj.project.name,
        Value: `Total: ${proj.totalHours.toFixed(1)}h, Billable: ${proj.billableHours.toFixed(1)}h`,
      });
    });

    // By user
    reportData.byUser.forEach((user) => {
      data.push({
        Section: 'By User',
        Metric: `${user.user.firstName} ${user.user.lastName}`,
        Value: `Total: ${user.totalHours.toFixed(1)}h, Billable: ${user.billableHours.toFixed(1)}h`,
      });
    });

    const fields = ['Section', 'Metric', 'Value'];
    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  /**
   * Export task metrics report to CSV
   */
  exportTaskMetricsCSV(reportData) {
    const data = [];

    // Summary
    data.push({
      Section: 'Summary',
      Metric: 'Total Tasks',
      Value: reportData.summary.totalTasks,
    });
    data.push({
      Section: 'Summary',
      Metric: 'Completed Tasks',
      Value: reportData.summary.completedTasks,
    });
    data.push({
      Section: 'Summary',
      Metric: 'Overdue Tasks',
      Value: reportData.summary.overdueTasks,
    });
    data.push({
      Section: 'Summary',
      Metric: 'Avg Completion Time (days)',
      Value: reportData.summary.avgCompletionTimeDays.toFixed(1),
    });

    // By priority
    reportData.byPriority.forEach((stat) => {
      data.push({
        Section: 'By Priority',
        Metric: stat._id,
        Value: `Total: ${stat.count}, Completed: ${stat.completed}, Avg Est: ${(stat.avgEstimatedHours || 0).toFixed(1)}h`,
      });
    });

    // By status
    reportData.byStatus.forEach((stat) => {
      data.push({
        Section: 'By Status',
        Metric: stat._id,
        Value: `Count: ${stat.count}, Est: ${(stat.totalEstimatedHours || 0).toFixed(1)}h, Actual: ${(stat.totalActualHours || 0).toFixed(1)}h`,
      });
    });

    // By assignee
    if (reportData.byAssignee) {
      reportData.byAssignee.forEach((assignee) => {
        data.push({
          Section: 'By Assignee',
          Metric: `${assignee.user.firstName} ${assignee.user.lastName}`,
          Value: `Tasks: ${assignee.totalTasks}, Completed: ${assignee.completedTasks} (${assignee.completionRate}%)`,
        });
      });
    }

    const fields = ['Section', 'Metric', 'Value'];
    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  /**
   * Export time entries to CSV
   */
  exportTimeEntriesCSV(timeEntries) {
    const data = timeEntries.map((entry) => ({
      Date: format(new Date(entry.date), 'yyyy-MM-dd'),
      User: entry.userId
        ? `${entry.userId.firstName} ${entry.userId.lastName}`
        : 'N/A',
      Project: entry.projectId ? entry.projectId.name : 'N/A',
      Task: entry.taskId ? entry.taskId.title : 'N/A',
      Hours: entry.hours,
      Description: entry.description || '',
      Billable: entry.billable ? 'Yes' : 'No',
      'Billing Rate': entry.billingRate || 0,
      Status: entry.status,
    }));

    const fields = [
      'Date',
      'User',
      'Project',
      'Task',
      'Hours',
      'Description',
      'Billable',
      'Billing Rate',
      'Status',
    ];
    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  /**
   * Export tasks to CSV
   */
  exportTasksCSV(tasks) {
    const data = tasks.map((task) => ({
      ID: task.taskNumber || task._id,
      Title: task.title,
      Status: task.status,
      Priority: task.priority,
      Assignees: task.assigneeIds
        ? task.assigneeIds.map((a) => `${a.firstName} ${a.lastName}`).join(', ')
        : '',
      'Due Date': task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
      'Estimated Hours': task.estimatedHours || 0,
      'Actual Hours': task.actualHours || 0,
      'Created At': format(new Date(task.createdAt), 'yyyy-MM-dd'),
      'Completed At': task.completedAt
        ? format(new Date(task.completedAt), 'yyyy-MM-dd')
        : '',
    }));

    const fields = [
      'ID',
      'Title',
      'Status',
      'Priority',
      'Assignees',
      'Due Date',
      'Estimated Hours',
      'Actual Hours',
      'Created At',
      'Completed At',
    ];
    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  /**
   * Export issues to CSV
   */
  exportIssuesCSV(issues) {
    const data = issues.map((issue) => ({
      ID: issue.issueNumber || issue._id,
      Title: issue.title,
      Type: issue.type,
      Status: issue.status,
      Severity: issue.severity,
      Priority: issue.priority,
      Reporter: issue.reportedBy
        ? `${issue.reportedBy.firstName} ${issue.reportedBy.lastName}`
        : '',
      Assignee: issue.assigneeId
        ? `${issue.assigneeId.firstName} ${issue.assigneeId.lastName}`
        : '',
      'Created At': format(new Date(issue.createdAt), 'yyyy-MM-dd'),
      'Resolved At': issue.resolvedAt
        ? format(new Date(issue.resolvedAt), 'yyyy-MM-dd')
        : '',
    }));

    const fields = [
      'ID',
      'Title',
      'Type',
      'Status',
      'Severity',
      'Priority',
      'Reporter',
      'Assignee',
      'Created At',
      'Resolved At',
    ];
    const parser = new Parser({ fields });
    return parser.parse(data);
  }

  /**
   * Export projects to CSV
   */
  exportProjectsCSV(projects) {
    const data = projects.map((project) => ({
      Name: project.name,
      Key: project.key,
      Status: project.status,
      Priority: project.priority,
      'Start Date': project.startDate
        ? format(new Date(project.startDate), 'yyyy-MM-dd')
        : '',
      'End Date': project.endDate
        ? format(new Date(project.endDate), 'yyyy-MM-dd')
        : '',
      'Member Count': project.members ? project.members.length : 0,
      'Created At': format(new Date(project.createdAt), 'yyyy-MM-dd'),
    }));

    const fields = [
      'Name',
      'Key',
      'Status',
      'Priority',
      'Start Date',
      'End Date',
      'Member Count',
      'Created At',
    ];
    const parser = new Parser({ fields });
    return parser.parse(data);
  }
}

module.exports = new CSVExporter();
