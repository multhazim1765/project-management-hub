const { Task, TaskLabel, Project } = require('../models');
const { notificationService } = require('../services');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const { getPagination } = require('../utils/helpers');
const { TASK_STATUS } = require('../config/constants');

/**
 * @desc    Create new task
 * @route   POST /api/projects/:projectId/tasks
 * @access  Private (Project Member)
 */
const createTask = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    title,
    description,
    priority,
    status,
    dueDate,
    startDate,
    estimatedHours,
    assigneeIds,
    milestoneId,
    parentTaskId,
    labels,
  } = req.body;

  const task = new Task({
    title,
    description,
    projectId,
    priority,
    status,
    dueDate,
    startDate,
    estimatedHours,
    assigneeIds,
    milestoneId,
    parentTaskId,
    labels,
    createdBy: req.userId,
    watchers: [req.userId],
  });

  await task.save();

  await task.populate([
    { path: 'assigneeIds', select: 'firstName lastName email avatar' },
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'milestoneId', select: 'name' },
    { path: 'labels', select: 'name color' },
  ]);

  // Set task key with project prefix
  const project = await Project.findById(projectId).select('key');
  task._taskKey = `${project.key}-${task.taskNumber}`;

  // Send notifications to assignees
  if (assigneeIds?.length > 0) {
    await notificationService.notifyTaskAssignment(task, assigneeIds, req.user, project);
  }

  ApiResponse.created(res, { task }, 'Task created successfully');
});

/**
 * @desc    Get tasks for project
 * @route   GET /api/projects/:projectId/tasks
 * @access  Private (Project Member)
 */
const getTasks = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const {
    status,
    priority,
    assigneeId,
    milestoneId,
    parentTaskId,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const options = {
    status,
    priority,
    assigneeId,
    milestoneId,
    parentTaskId: parentTaskId === 'none' ? null : parentTaskId,
    search,
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder: sortOrder === 'asc' ? 1 : -1,
  };

  const { tasks, total } = await Task.getByProject(projectId, options);
  const pagination = getPagination(page, limit, total);

  // Add project key prefix to tasks
  const project = await Project.findById(projectId).select('key');
  const tasksWithKey = tasks.map((task) => {
    const taskObj = task.toObject();
    taskObj.taskKey = `${project.key}-${task.taskNumber}`;
    return taskObj;
  });

  ApiResponse.paginated(res, { tasks: tasksWithKey }, pagination);
});

/**
 * @desc    Get single task
 * @route   GET /api/tasks/:id
 * @access  Private (Project Member)
 */
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assigneeIds', 'firstName lastName email avatar')
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('milestoneId', 'name dueDate')
    .populate('labels', 'name color')
    .populate('dependencies.dependsOnTaskId', 'title taskNumber status')
    .populate('watchers', 'firstName lastName email avatar');

  if (!task) {
    return ApiResponse.notFound(res, 'Task not found');
  }

  // Get subtasks
  const subtasks = await Task.find({ parentTaskId: task._id })
    .populate('assigneeIds', 'firstName lastName email avatar')
    .select('title status priority dueDate taskNumber');

  // Get project for task key
  const project = await Project.findById(task.projectId).select('key name');
  task._taskKey = `${project.key}-${task.taskNumber}`;

  // Add dependent tasks (tasks that depend on this one)
  const dependentTasks = await Task.find({
    'dependencies.dependsOnTaskId': task._id,
  }).select('title taskNumber status');

  ApiResponse.success(res, {
    task: {
      ...task.toObject(),
      taskKey: task._taskKey,
      subtasks,
      dependentTasks,
      project: { _id: project._id, name: project.name, key: project.key },
    },
  });
});

/**
 * @desc    Update task
 * @route   PUT /api/tasks/:id
 * @access  Private (Project Member)
 */
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return ApiResponse.notFound(res, 'Task not found');
  }

  const {
    title,
    description,
    priority,
    status,
    dueDate,
    startDate,
    estimatedHours,
    milestoneId,
    progress,
    order,
  } = req.body;

  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority) task.priority = priority;
  if (status) task.status = status;
  if (dueDate !== undefined) task.dueDate = dueDate;
  if (startDate !== undefined) task.startDate = startDate;
  if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
  if (milestoneId !== undefined) task.milestoneId = milestoneId || null;
  if (progress !== undefined) task.progress = progress;
  if (order !== undefined) task.order = order;

  await task.save();

  await task.populate([
    { path: 'assigneeIds', select: 'firstName lastName email avatar' },
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'milestoneId', select: 'name' },
    { path: 'labels', select: 'name color' },
  ]);

  // Update parent task progress if this is a subtask
  if (task.parentTaskId) {
    const parentTask = await Task.findById(task.parentTaskId);
    if (parentTask) {
      await parentTask.updateProgressFromSubtasks();
    }
  }

  // Notify watchers of update
  const project = await Project.findById(task.projectId);
  await notificationService.notifyTaskUpdate(task, req.user, project, task.watchers);

  ApiResponse.success(res, { task }, 'Task updated');
});

/**
 * @desc    Delete task
 * @route   DELETE /api/tasks/:id
 * @access  Private (Project Member)
 */
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return ApiResponse.notFound(res, 'Task not found');
  }

  // Delete subtasks
  await Task.deleteMany({ parentTaskId: task._id });

  // Remove from dependencies
  await Task.updateMany(
    { 'dependencies.dependsOnTaskId': task._id },
    { $pull: { dependencies: { dependsOnTaskId: task._id } } }
  );

  await task.deleteOne();

  ApiResponse.success(res, null, 'Task deleted');
});

/**
 * @desc    Assign task to users
 * @route   POST /api/tasks/:id/assign
 * @access  Private (Project Member)
 */
const assignTask = asyncHandler(async (req, res) => {
  const { assigneeIds } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task) {
    return ApiResponse.notFound(res, 'Task not found');
  }

  const previousAssignees = task.assigneeIds.map((id) => id.toString());
  task.assigneeIds = assigneeIds;
  await task.save();

  await task.populate('assigneeIds', 'firstName lastName email avatar');

  // Notify new assignees
  const newAssignees = assigneeIds.filter(
    (id) => !previousAssignees.includes(id.toString())
  );

  if (newAssignees.length > 0) {
    const project = await Project.findById(task.projectId);
    await notificationService.notifyTaskAssignment(task, newAssignees, req.user, project);
  }

  ApiResponse.success(res, { task }, 'Task assigned');
});

/**
 * @desc    Update task status
 * @route   PUT /api/tasks/:id/status
 * @access  Private (Project Member)
 */
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task) {
    return ApiResponse.notFound(res, 'Task not found');
  }

  // Check dependencies for finish-to-start
  if (status === TASK_STATUS.IN_PROGRESS || status === TASK_STATUS.COMPLETED) {
    const blockingTasks = await Task.find({
      _id: { $in: task.dependencies.map((d) => d.dependsOnTaskId) },
      status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] },
    });

    if (blockingTasks.length > 0) {
      return ApiResponse.badRequest(
        res,
        'Cannot update status. Task has unfinished dependencies.',
        blockingTasks.map((t) => ({ id: t._id, title: t.title }))
      );
    }
  }

  task.status = status;
  await task.save();

  // Update parent task progress
  if (task.parentTaskId) {
    const parentTask = await Task.findById(task.parentTaskId);
    if (parentTask) {
      await parentTask.updateProgressFromSubtasks();
    }
  }

  await task.populate('assigneeIds', 'firstName lastName email avatar');

  ApiResponse.success(res, { task }, 'Status updated');
});

/**
 * @desc    Add task dependency
 * @route   POST /api/tasks/:id/dependencies
 * @access  Private (Project Member)
 */
const addDependency = asyncHandler(async (req, res) => {
  const { dependsOnTaskId, type } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task) {
    return ApiResponse.notFound(res, 'Task not found');
  }

  // Prevent circular dependency
  if (dependsOnTaskId === req.params.id) {
    return ApiResponse.badRequest(res, 'Task cannot depend on itself');
  }

  // Check if dependency task exists
  const dependencyTask = await Task.findById(dependsOnTaskId);
  if (!dependencyTask) {
    return ApiResponse.notFound(res, 'Dependency task not found');
  }

  // Check for circular dependency
  const hasCycle = await checkCircularDependency(task._id, dependsOnTaskId);
  if (hasCycle) {
    return ApiResponse.badRequest(res, 'Adding this dependency would create a circular reference');
  }

  await task.addDependency(dependsOnTaskId, type);

  await task.populate('dependencies.dependsOnTaskId', 'title taskNumber status');

  ApiResponse.success(res, { task }, 'Dependency added');
});

/**
 * @desc    Remove task dependency
 * @route   DELETE /api/tasks/:id/dependencies/:dependsOnTaskId
 * @access  Private (Project Member)
 */
const removeDependency = asyncHandler(async (req, res) => {
  const { dependsOnTaskId } = req.params;

  const task = await Task.findById(req.params.id);
  if (!task) {
    return ApiResponse.notFound(res, 'Task not found');
  }

  await task.removeDependency(dependsOnTaskId);

  ApiResponse.success(res, { task }, 'Dependency removed');
});

/**
 * @desc    Add/remove task labels
 * @route   PUT /api/tasks/:id/labels
 * @access  Private (Project Member)
 */
const updateLabels = asyncHandler(async (req, res) => {
  const { labels } = req.body;

  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { labels },
    { new: true }
  ).populate('labels', 'name color');

  if (!task) {
    return ApiResponse.notFound(res, 'Task not found');
  }

  ApiResponse.success(res, { task }, 'Labels updated');
});

/**
 * @desc    Add watcher to task
 * @route   POST /api/tasks/:id/watch
 * @access  Private (Project Member)
 */
const watchTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) {
    return ApiResponse.notFound(res, 'Task not found');
  }

  if (!task.watchers.includes(req.userId)) {
    task.watchers.push(req.userId);
    await task.save();
  }

  ApiResponse.success(res, null, 'Now watching task');
});

/**
 * @desc    Remove watcher from task
 * @route   DELETE /api/tasks/:id/watch
 * @access  Private (Project Member)
 */
const unwatchTask = asyncHandler(async (req, res) => {
  await Task.findByIdAndUpdate(req.params.id, {
    $pull: { watchers: req.userId },
  });

  ApiResponse.success(res, null, 'Stopped watching task');
});

/**
 * @desc    Bulk update tasks
 * @route   PUT /api/projects/:projectId/tasks/bulk
 * @access  Private (Project Member)
 */
const bulkUpdate = asyncHandler(async (req, res) => {
  const { taskIds, updates } = req.body;

  await Task.updateMany(
    { _id: { $in: taskIds }, projectId: req.params.projectId },
    { $set: updates }
  );

  const tasks = await Task.find({ _id: { $in: taskIds } })
    .populate('assigneeIds', 'firstName lastName email avatar');

  ApiResponse.success(res, { tasks, count: tasks.length }, 'Tasks updated');
});

/**
 * @desc    Get my tasks
 * @route   GET /api/tasks/my-tasks
 * @access  Private
 */
const getMyTasks = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {
    assigneeIds: req.userId,
  };

  if (status) {
    query.status = status;
  } else {
    query.status = { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] };
  }

  const total = await Task.countDocuments(query);
  const pagination = getPagination(page, limit, total);

  const tasks = await Task.find(query)
    .populate('projectId', 'name key')
    .populate('assigneeIds', 'firstName lastName email avatar')
    .sort({ dueDate: 1, priority: -1 })
    .skip(pagination.skip)
    .limit(pagination.perPage);

  // Add task keys
  const tasksWithKey = tasks.map((task) => ({
    ...task.toObject(),
    taskKey: `${task.projectId.key}-${task.taskNumber}`,
  }));

  ApiResponse.paginated(res, { tasks: tasksWithKey }, pagination);
});

/**
 * @desc    Get overdue tasks
 * @route   GET /api/tasks/overdue
 * @access  Private
 */
const getOverdueTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.getOverdueTasks(null, req.userId);

  ApiResponse.success(res, { tasks, count: tasks.length });
});

/**
 * @desc    Create task label
 * @route   POST /api/projects/:projectId/labels
 * @access  Private (Project Member)
 */
const createLabel = asyncHandler(async (req, res) => {
  const { name, color, description } = req.body;

  const label = new TaskLabel({
    name,
    color,
    description,
    projectId: req.params.projectId,
    createdBy: req.userId,
  });

  await label.save();

  ApiResponse.created(res, { label }, 'Label created');
});

/**
 * @desc    Get project labels
 * @route   GET /api/projects/:projectId/labels
 * @access  Private (Project Member)
 */
const getLabels = asyncHandler(async (req, res) => {
  const labels = await TaskLabel.find({ projectId: req.params.projectId })
    .sort({ name: 1 });

  ApiResponse.success(res, { labels });
});

/**
 * @desc    Delete label
 * @route   DELETE /api/labels/:id
 * @access  Private (Project Member)
 */
const deleteLabel = asyncHandler(async (req, res) => {
  await TaskLabel.findByIdAndDelete(req.params.id);

  // Remove label from all tasks
  await Task.updateMany(
    { labels: req.params.id },
    { $pull: { labels: req.params.id } }
  );

  ApiResponse.success(res, null, 'Label deleted');
});

/**
 * @desc    Get subtasks for a task
 * @route   GET /api/tasks/:id/subtasks
 * @access  Private
 */
const getSubtasks = asyncHandler(async (req, res) => {
  const subtasks = await Task.find({
    parentTaskId: req.params.id,
  })
    .populate('assigneeIds', 'firstName lastName email avatar')
    .populate('createdBy', 'firstName lastName email avatar')
    .sort({ order: 1, createdAt: 1 });

  ApiResponse.success(res, { subtasks });
});

/**
 * @desc    Create subtask
 * @route   POST /api/tasks/:id/subtasks
 * @access  Private (Project Member)
 */
const createSubtask = asyncHandler(async (req, res) => {
  const parentTask = await Task.findById(req.params.id);

  if (!parentTask) {
    return ApiResponse.notFound(res, 'Parent task not found');
  }

  const { title, description, priority, estimatedHours, assigneeIds } = req.body;

  const subtask = new Task({
    title,
    description,
    priority,
    estimatedHours,
    assigneeIds,
    projectId: parentTask.projectId,
    parentTaskId: parentTask._id,
    createdBy: req.userId,
    watchers: [req.userId],
  });

  await subtask.save();

  await subtask.populate([
    { path: 'assigneeIds', select: 'firstName lastName email avatar' },
    { path: 'createdBy', select: 'firstName lastName email avatar' },
  ]);

  ApiResponse.created(res, { subtask }, 'Subtask created successfully');
});

/**
 * @desc    Reorder subtasks
 * @route   PUT /api/tasks/:id/subtasks/reorder
 * @access  Private (Project Member)
 */
const reorderSubtasks = asyncHandler(async (req, res) => {
  const { subtaskIds } = req.body;

  if (!Array.isArray(subtaskIds)) {
    return ApiResponse.badRequest(res, 'subtaskIds must be an array');
  }

  // Update order for each subtask
  const updatePromises = subtaskIds.map((subtaskId, index) =>
    Task.findByIdAndUpdate(subtaskId, { order: index }, { new: true })
  );

  await Promise.all(updatePromises);

  const subtasks = await Task.find({ parentTaskId: req.params.id })
    .populate('assigneeIds', 'firstName lastName email avatar')
    .sort({ order: 1 });

  ApiResponse.success(res, { subtasks }, 'Subtasks reordered');
});

// Helper function to check for circular dependencies
async function checkCircularDependency(taskId, dependsOnTaskId, visited = new Set()) {
  if (visited.has(dependsOnTaskId.toString())) {
    return dependsOnTaskId.toString() === taskId.toString();
  }

  visited.add(dependsOnTaskId.toString());

  const task = await Task.findById(dependsOnTaskId);
  if (!task || !task.dependencies?.length) {
    return false;
  }

  for (const dep of task.dependencies) {
    if (dep.dependsOnTaskId.toString() === taskId.toString()) {
      return true;
    }
    const hasCycle = await checkCircularDependency(taskId, dep.dependsOnTaskId, visited);
    if (hasCycle) return true;
  }

  return false;
}

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  assignTask,
  updateStatus,
  addDependency,
  removeDependency,
  updateLabels,
  watchTask,
  unwatchTask,
  bulkUpdate,
  getMyTasks,
  getOverdueTasks,
  createLabel,
  getLabels,
  deleteLabel,
  getSubtasks,
  createSubtask,
  reorderSubtasks,
};
