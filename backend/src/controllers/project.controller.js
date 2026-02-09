const { Project, ProjectTemplate, Task, Milestone, User } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const { getPagination } = require('../utils/helpers');
const { ROLES, PROJECT_STATUS } = require('../config/constants');

/**
 * @desc    Create new project
 * @route   POST /api/projects
 * @access  Private (Project Admin+)
 */
const createProject = asyncHandler(async (req, res) => {
  const { name, description, key, startDate, endDate, priority, color, tags } = req.body;

  const project = new Project({
    name,
    description,
    key,
    startDate,
    endDate,
    priority,
    color,
    tags,
    organizationId: req.organizationId,
    createdBy: req.userId,
    members: [
      {
        userId: req.userId,
        role: ROLES.PROJECT_MANAGER,
        addedBy: req.userId,
      },
    ],
  });

  await project.save();

  await project.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'members.userId', select: 'firstName lastName email avatar' },
  ]);

  ApiResponse.created(res, { project }, 'Project created successfully');
});

/**
 * @desc    Create project from template
 * @route   POST /api/projects/from-template
 * @access  Private (Project Admin+)
 */
const createFromTemplate = asyncHandler(async (req, res) => {
  const { templateId, name, startDate, description } = req.body;

  const template = await ProjectTemplate.findById(templateId);
  if (!template) {
    return ApiResponse.notFound(res, 'Template not found');
  }

  // Create project
  const project = new Project({
    name,
    description: description || template.description,
    startDate: startDate || new Date(),
    organizationId: req.organizationId,
    createdBy: req.userId,
    templateId,
    settings: {
      ...template.settings,
    },
    members: [
      {
        userId: req.userId,
        role: ROLES.PROJECT_MANAGER,
        addedBy: req.userId,
      },
    ],
  });

  await project.save();

  // Create milestones from template
  const milestoneMap = {};
  for (const tmpl of template.defaultMilestones) {
    const dueDate = new Date(project.startDate);
    dueDate.setDate(dueDate.getDate() + tmpl.daysFromStart);

    const milestone = new Milestone({
      name: tmpl.name,
      description: tmpl.description,
      projectId: project._id,
      dueDate,
      order: tmpl.order,
      createdBy: req.userId,
    });

    await milestone.save();
    milestoneMap[tmpl.order] = milestone._id;
  }

  // Create tasks from template
  const taskMap = {};
  for (let i = 0; i < template.defaultTasks.length; i++) {
    const tmpl = template.defaultTasks[i];

    const task = new Task({
      title: tmpl.title,
      description: tmpl.description,
      projectId: project._id,
      priority: tmpl.priority,
      estimatedHours: tmpl.estimatedHours,
      order: tmpl.order,
      createdBy: req.userId,
      parentTaskId: tmpl.parentIndex !== undefined ? taskMap[tmpl.parentIndex] : undefined,
    });

    await task.save();
    taskMap[i] = task._id;
  }

  // Map tasks to milestones
  for (const tmpl of template.defaultMilestones) {
    if (tmpl.taskIndices?.length > 0) {
      const taskIds = tmpl.taskIndices.map((idx) => taskMap[idx]).filter(Boolean);
      await Task.updateMany(
        { _id: { $in: taskIds } },
        { milestoneId: milestoneMap[tmpl.order] }
      );
    }
  }

  // Increment template usage
  await template.incrementUsage();

  await project.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'members.userId', select: 'firstName lastName email avatar' },
  ]);

  ApiResponse.created(res, { project }, 'Project created from template');
});

/**
 * @desc    Get all projects
 * @route   GET /api/projects
 * @access  Private
 */
const getProjects = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  const query = { organizationId: req.organizationId };

  // Filter by status
  if (status) {
    query.status = status;
  } else {
    query.status = { $ne: PROJECT_STATUS.ARCHIVED };
  }

  // Filter by member if not admin
  if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.PROJECT_ADMIN) {
    query['members.userId'] = req.userId;
  }

  // Search
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { key: { $regex: search, $options: 'i' } },
    ];
  }

  const total = await Project.countDocuments(query);
  const pagination = getPagination(page, limit, total);

  const projects = await Project.find(query)
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('members.userId', 'firstName lastName email avatar')
    .sort({ updatedAt: -1 })
    .skip(pagination.skip)
    .limit(pagination.perPage);

  ApiResponse.paginated(res, { projects }, pagination);
});

/**
 * @desc    Get single project
 * @route   GET /api/projects/:id
 * @access  Private (Project Member)
 */
const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('members.userId', 'firstName lastName email avatar')
    .populate('members.addedBy', 'firstName lastName');

  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  ApiResponse.success(res, { project });
});

/**
 * @desc    Update project
 * @route   PUT /api/projects/:id
 * @access  Private (Project Manager+)
 */
const updateProject = asyncHandler(async (req, res) => {
  const { name, description, startDate, endDate, status, priority, color, tags, settings } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  if (name) project.name = name;
  if (description !== undefined) project.description = description;
  if (startDate) project.startDate = startDate;
  if (endDate) project.endDate = endDate;
  if (status) project.status = status;
  if (priority) project.priority = priority;
  if (color) project.color = color;
  if (tags) project.tags = tags;
  if (settings) project.settings = { ...project.settings, ...settings };

  await project.save();

  await project.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'members.userId', select: 'firstName lastName email avatar' },
  ]);

  ApiResponse.success(res, { project }, 'Project updated');
});

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:id
 * @access  Private (Project Admin+)
 */
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  // Soft delete - archive instead of hard delete
  await project.archive(req.userId);

  ApiResponse.success(res, null, 'Project archived');
});

/**
 * @desc    Archive project
 * @route   POST /api/projects/:id/archive
 * @access  Private (Project Manager+)
 */
const archiveProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  await project.archive(req.userId);

  ApiResponse.success(res, { project }, 'Project archived');
});

/**
 * @desc    Restore archived project
 * @route   POST /api/projects/:id/restore
 * @access  Private (Project Admin+)
 */
const restoreProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  await project.restore();

  await project.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'members.userId', select: 'firstName lastName email avatar' },
  ]);

  ApiResponse.success(res, { project }, 'Project restored');
});

/**
 * @desc    Add member to project
 * @route   POST /api/projects/:id/members
 * @access  Private (Project Manager+)
 */
const addMember = asyncHandler(async (req, res) => {
  const { userId, role } = req.body;

  const project = await Project.findById(req.params.id);
  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  // Verify user exists in organization
  const user = await User.findOne({ _id: userId, organizationId: req.organizationId });
  if (!user) {
    return ApiResponse.notFound(res, 'User not found in organization');
  }

  await project.addMember(userId, role, req.userId);

  await project.populate('members.userId', 'firstName lastName email avatar');

  ApiResponse.success(res, { project }, 'Member added');
});

/**
 * @desc    Remove member from project
 * @route   DELETE /api/projects/:id/members/:userId
 * @access  Private (Project Manager+)
 */
const removeMember = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  await project.removeMember(req.params.userId);

  await project.populate('members.userId', 'firstName lastName email avatar');

  ApiResponse.success(res, { project }, 'Member removed');
});

/**
 * @desc    Get project members
 * @route   GET /api/projects/:id/members
 * @access  Private (Project Member)
 */
const getMembers = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .select('members')
    .populate('members.userId', 'firstName lastName email avatar jobTitle')
    .populate('members.addedBy', 'firstName lastName');

  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  ApiResponse.success(res, { members: project.members });
});

/**
 * @desc    Duplicate project
 * @route   POST /api/projects/:id/duplicate
 * @access  Private (Project Admin+)
 */
const duplicateProject = asyncHandler(async (req, res) => {
  const { name, includeTasks, includeMilestones } = req.body;

  const sourceProject = await Project.findById(req.params.id);
  if (!sourceProject) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  // Create new project
  const newProject = new Project({
    name: name || `${sourceProject.name} (Copy)`,
    description: sourceProject.description,
    organizationId: req.organizationId,
    createdBy: req.userId,
    priority: sourceProject.priority,
    color: sourceProject.color,
    tags: sourceProject.tags,
    settings: sourceProject.settings,
    members: [
      {
        userId: req.userId,
        role: ROLES.PROJECT_MANAGER,
        addedBy: req.userId,
      },
    ],
  });

  await newProject.save();

  // Duplicate milestones
  const milestoneMap = {};
  if (includeMilestones) {
    const milestones = await Milestone.find({ projectId: sourceProject._id });
    for (const milestone of milestones) {
      const newMilestone = new Milestone({
        name: milestone.name,
        description: milestone.description,
        projectId: newProject._id,
        dueDate: milestone.dueDate,
        order: milestone.order,
        color: milestone.color,
        createdBy: req.userId,
      });
      await newMilestone.save();
      milestoneMap[milestone._id.toString()] = newMilestone._id;
    }
  }

  // Duplicate tasks
  if (includeTasks) {
    const tasks = await Task.find({ projectId: sourceProject._id, parentTaskId: { $exists: false } });
    const taskMap = {};

    const duplicateTask = async (task, parentId = null) => {
      const newTask = new Task({
        title: task.title,
        description: task.description,
        projectId: newProject._id,
        priority: task.priority,
        estimatedHours: task.estimatedHours,
        order: task.order,
        labels: task.labels,
        parentTaskId: parentId,
        milestoneId: task.milestoneId ? milestoneMap[task.milestoneId.toString()] : undefined,
        createdBy: req.userId,
      });
      await newTask.save();
      taskMap[task._id.toString()] = newTask._id;

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

  await newProject.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'members.userId', select: 'firstName lastName email avatar' },
  ]);

  ApiResponse.created(res, { project: newProject }, 'Project duplicated');
});

/**
 * @desc    Get project templates
 * @route   GET /api/project-templates
 * @access  Private
 */
const getTemplates = asyncHandler(async (req, res) => {
  const templates = await ProjectTemplate.getAvailableTemplates(req.organizationId);

  ApiResponse.success(res, { templates });
});

/**
 * @desc    Create project template
 * @route   POST /api/project-templates
 * @access  Private (Project Admin+)
 */
const createTemplate = asyncHandler(async (req, res) => {
  const template = new ProjectTemplate({
    ...req.body,
    organizationId: req.organizationId,
    createdBy: req.userId,
  });

  await template.save();

  ApiResponse.created(res, { template }, 'Template created');
});

module.exports = {
  createProject,
  createFromTemplate,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
  addMember,
  removeMember,
  getMembers,
  duplicateProject,
  getTemplates,
  createTemplate,
};
