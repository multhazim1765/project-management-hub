const { Milestone, Task } = require('../models');
const { notificationService } = require('../services');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');

/**
 * @desc    Create milestone
 * @route   POST /api/projects/:projectId/milestones
 * @access  Private (Project Manager+)
 */
const createMilestone = asyncHandler(async (req, res) => {
  const { name, description, dueDate, startDate, color } = req.body;

  // Get the order for new milestone
  const lastMilestone = await Milestone.findOne({ projectId: req.params.projectId })
    .sort({ order: -1 });

  const milestone = new Milestone({
    name,
    description,
    dueDate,
    startDate,
    color,
    projectId: req.params.projectId,
    createdBy: req.userId,
    order: lastMilestone ? lastMilestone.order + 1 : 0,
  });

  await milestone.save();
  await milestone.calculateProgress();

  await milestone.populate([
    { path: 'createdBy', select: 'firstName lastName' },
    { path: 'owner', select: 'firstName lastName' },
  ]);

  ApiResponse.created(res, { milestone }, 'Milestone created');
});

/**
 * @desc    Get milestones for project
 * @route   GET /api/projects/:projectId/milestones
 * @access  Private (Project Member)
 */
const getMilestones = asyncHandler(async (req, res) => {
  const milestones = await Milestone.getWithProgress(req.params.projectId);

  ApiResponse.success(res, { milestones });
});

/**
 * @desc    Get single milestone
 * @route   GET /api/milestones/:id
 * @access  Private (Project Member)
 */
const getMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findById(req.params.id)
    .populate('createdBy', 'firstName lastName')
    .populate('owner', 'firstName lastName');

  if (!milestone) {
    return ApiResponse.notFound(res, 'Milestone not found');
  }

  await milestone.calculateProgress();

  // Get tasks for milestone
  const tasks = await Task.find({ milestoneId: milestone._id })
    .populate('assigneeIds', 'firstName lastName email avatar')
    .sort({ order: 1 });

  ApiResponse.success(res, { milestone: { ...milestone.toObject(), tasks } });
});

/**
 * @desc    Update milestone
 * @route   PUT /api/milestones/:id
 * @access  Private (Project Manager+)
 */
const updateMilestone = asyncHandler(async (req, res) => {
  const { name, description, dueDate, startDate, status, color, owner, order } = req.body;

  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) {
    return ApiResponse.notFound(res, 'Milestone not found');
  }

  if (name) milestone.name = name;
  if (description !== undefined) milestone.description = description;
  if (dueDate) milestone.dueDate = dueDate;
  if (startDate !== undefined) milestone.startDate = startDate;
  if (status) milestone.status = status;
  if (color) milestone.color = color;
  if (owner !== undefined) milestone.owner = owner;
  if (order !== undefined) milestone.order = order;

  await milestone.save();
  await milestone.calculateProgress();

  await milestone.populate([
    { path: 'createdBy', select: 'firstName lastName' },
    { path: 'owner', select: 'firstName lastName' },
  ]);

  ApiResponse.success(res, { milestone }, 'Milestone updated');
});

/**
 * @desc    Delete milestone
 * @route   DELETE /api/milestones/:id
 * @access  Private (Project Manager+)
 */
const deleteMilestone = asyncHandler(async (req, res) => {
  const milestone = await Milestone.findById(req.params.id);
  if (!milestone) {
    return ApiResponse.notFound(res, 'Milestone not found');
  }

  // Remove milestone reference from tasks
  await Task.updateMany(
    { milestoneId: milestone._id },
    { $unset: { milestoneId: '' } }
  );

  await milestone.deleteOne();

  ApiResponse.success(res, null, 'Milestone deleted');
});

/**
 * @desc    Get tasks for milestone
 * @route   GET /api/milestones/:id/tasks
 * @access  Private (Project Member)
 */
const getMilestoneTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find({ milestoneId: req.params.id })
    .populate('assigneeIds', 'firstName lastName email avatar')
    .populate('createdBy', 'firstName lastName')
    .sort({ order: 1, createdAt: -1 });

  ApiResponse.success(res, { tasks });
});

/**
 * @desc    Reorder milestones
 * @route   PUT /api/projects/:projectId/milestones/reorder
 * @access  Private (Project Manager+)
 */
const reorderMilestones = asyncHandler(async (req, res) => {
  const { milestoneOrders } = req.body;

  // milestoneOrders is an array of { id, order }
  for (const item of milestoneOrders) {
    await Milestone.findByIdAndUpdate(item.id, { order: item.order });
  }

  const milestones = await Milestone.getWithProgress(req.params.projectId);

  ApiResponse.success(res, { milestones }, 'Milestones reordered');
});

module.exports = {
  createMilestone,
  getMilestones,
  getMilestone,
  updateMilestone,
  deleteMilestone,
  getMilestoneTasks,
  reorderMilestones,
};
