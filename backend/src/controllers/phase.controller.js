const { Phase, Task, Project } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');

/**
 * @desc    Create phase
 * @route   POST /api/projects/:projectId/phases
 * @access  Private (Project Manager+)
 */
const createPhase = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, startDate, endDate, color } = req.body;

  // Verify project exists
  const project = await Project.findById(projectId);
  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  // Get next order number
  const lastPhase = await Phase.findOne({ projectId }).sort({ order: -1 });
  const order = lastPhase ? lastPhase.order + 1 : 0;

  const phase = new Phase({
    name,
    description,
    projectId,
    startDate,
    endDate,
    color,
    order,
    createdBy: req.userId,
  });

  await phase.save();

  await phase.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'taskCount' },
  ]);

  ApiResponse.created(res, { phase }, 'Phase created successfully');
});

/**
 * @desc    Get all phases for a project
 * @route   GET /api/projects/:projectId/phases
 * @access  Private (Project Member)
 */
const getPhases = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const phases = await Phase.find({ projectId })
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('taskCount')
    .sort({ order: 1 });

  ApiResponse.success(res, { phases });
});

/**
 * @desc    Get single phase
 * @route   GET /api/phases/:id
 * @access  Private (Project Member)
 */
const getPhase = asyncHandler(async (req, res) => {
  const phase = await Phase.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('taskCount');

  if (!phase) {
    return ApiResponse.notFound(res, 'Phase not found');
  }

  // Get tasks in this phase
  const tasks = await Task.find({ phaseId: phase._id })
    .populate('assigneeIds', 'firstName lastName email avatar')
    .sort({ order: 1 })
    .limit(50);

  ApiResponse.success(res, { phase: { ...phase.toObject(), tasks } });
});

/**
 * @desc    Update phase
 * @route   PUT /api/phases/:id
 * @access  Private (Project Manager+)
 */
const updatePhase = asyncHandler(async (req, res) => {
  const { name, description, startDate, endDate, color } = req.body;

  const phase = await Phase.findById(req.params.id);

  if (!phase) {
    return ApiResponse.notFound(res, 'Phase not found');
  }

  // Update fields
  if (name) phase.name = name;
  if (description !== undefined) phase.description = description;
  if (startDate !== undefined) phase.startDate = startDate;
  if (endDate !== undefined) phase.endDate = endDate;
  if (color) phase.color = color;

  await phase.save();

  await phase.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'taskCount' },
  ]);

  ApiResponse.success(res, { phase }, 'Phase updated successfully');
});

/**
 * @desc    Reorder phases
 * @route   PUT /api/projects/:projectId/phases/reorder
 * @access  Private (Project Manager+)
 */
const reorderPhases = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { phaseIds } = req.body; // Array of phase IDs in new order

  if (!Array.isArray(phaseIds)) {
    return ApiResponse.badRequest(res, 'phaseIds must be an array');
  }

  // Update order for each phase
  const updatePromises = phaseIds.map((phaseId, index) =>
    Phase.findOneAndUpdate(
      { _id: phaseId, projectId },
      { order: index },
      { new: true }
    )
  );

  await Promise.all(updatePromises);

  const phases = await Phase.find({ projectId })
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('taskCount')
    .sort({ order: 1 });

  ApiResponse.success(res, { phases }, 'Phases reordered successfully');
});

/**
 * @desc    Delete phase
 * @route   DELETE /api/phases/:id
 * @access  Private (Project Manager+)
 */
const deletePhase = asyncHandler(async (req, res) => {
  const phase = await Phase.findById(req.params.id);

  if (!phase) {
    return ApiResponse.notFound(res, 'Phase not found');
  }

  // Check if phase has tasks
  const taskCount = await Task.countDocuments({ phaseId: phase._id });

  if (taskCount > 0) {
    // Unassign tasks from this phase instead of blocking deletion
    await Task.updateMany({ phaseId: phase._id }, { $unset: { phaseId: 1 } });
  }

  await phase.deleteOne();

  ApiResponse.success(res, null, 'Phase deleted successfully');
});

/**
 * @desc    Get phase progress
 * @route   GET /api/phases/:id/progress
 * @access  Private (Project Member)
 */
const getPhaseProgress = asyncHandler(async (req, res) => {
  const phase = await Phase.findById(req.params.id).populate('taskCount');

  if (!phase) {
    return ApiResponse.notFound(res, 'Phase not found');
  }

  // Get task statistics
  const taskStats = await Task.aggregate([
    { $match: { phaseId: phase._id } },
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
  const completedTasks =
    taskStats.find((s) => s._id === 'closed')?.count || 0;
  const progressPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalEstimatedHours = taskStats.reduce(
    (sum, stat) => sum + (stat.estimatedHours || 0),
    0
  );
  const totalActualHours = taskStats.reduce(
    (sum, stat) => sum + (stat.actualHours || 0),
    0
  );

  // Calculate time progress
  let timeProgress = 0;
  if (phase.startDate && phase.endDate) {
    const now = new Date();
    const total = phase.endDate - phase.startDate;
    const elapsed = now - phase.startDate;
    timeProgress = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  const progress = {
    phase: {
      id: phase._id,
      name: phase.name,
      startDate: phase.startDate,
      endDate: phase.endDate,
    },
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      progressPercentage,
      byStatus: taskStats,
    },
    hours: {
      estimated: totalEstimatedHours,
      actual: totalActualHours,
    },
    timeProgress,
  };

  ApiResponse.success(res, { progress });
});

/**
 * @desc    Duplicate phase
 * @route   POST /api/phases/:id/duplicate
 * @access  Private (Project Manager+)
 */
const duplicatePhase = asyncHandler(async (req, res) => {
  const { name, includeTasks } = req.body;

  const sourcePhase = await Phase.findById(req.params.id);

  if (!sourcePhase) {
    return ApiResponse.notFound(res, 'Phase not found');
  }

  // Get next order number
  const lastPhase = await Phase.findOne({ projectId: sourcePhase.projectId }).sort({
    order: -1,
  });
  const order = lastPhase ? lastPhase.order + 1 : 0;

  // Create new phase
  const newPhase = new Phase({
    name: name || `${sourcePhase.name} (Copy)`,
    description: sourcePhase.description,
    projectId: sourcePhase.projectId,
    startDate: sourcePhase.startDate,
    endDate: sourcePhase.endDate,
    color: sourcePhase.color,
    order,
    createdBy: req.userId,
  });

  await newPhase.save();

  // Duplicate tasks if requested
  if (includeTasks) {
    const tasks = await Task.find({
      phaseId: sourcePhase._id,
      parentTaskId: { $exists: false },
    });

    const duplicateTask = async (task, parentId = null) => {
      const newTask = new Task({
        title: task.title,
        description: task.description,
        projectId: task.projectId,
        phaseId: newPhase._id,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        order: task.order,
        labels: task.labels,
        parentTaskId: parentId,
        createdBy: req.userId,
      });
      await newTask.save();

      // Duplicate subtasks
      const subtasks = await Task.find({ parentTaskId: task._id });
      for (const subtask of subtasks) {
        await duplicateTask(subtask, newTask._id);
      }
    };

    for (const task of tasks) {
      await duplicateTask(task);
    }
  }

  await newPhase.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'taskCount' },
  ]);

  ApiResponse.created(res, { phase: newPhase }, 'Phase duplicated successfully');
});

module.exports = {
  createPhase,
  getPhases,
  getPhase,
  updatePhase,
  reorderPhases,
  deletePhase,
  getPhaseProgress,
  duplicatePhase,
};
