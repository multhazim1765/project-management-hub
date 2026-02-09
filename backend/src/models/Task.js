const mongoose = require('mongoose');
const { TASK_STATUS, TASK_PRIORITY, DEPENDENCY_TYPES } = require('../config/constants');

const taskDependencySchema = new mongoose.Schema(
  {
    dependsOnTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(DEPENDENCY_TYPES),
      default: DEPENDENCY_TYPES.FINISH_TO_START,
    },
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    taskNumber: {
      type: Number,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
    },
    phaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Phase',
    },
    assigneeIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITY),
      default: TASK_PRIORITY.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(TASK_STATUS),
      default: TASK_STATUS.OPEN,
    },
    dueDate: {
      type: Date,
    },
    startDate: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    estimatedHours: {
      type: Number,
      min: 0,
    },
    actualHours: {
      type: Number,
      default: 0,
      min: 0,
    },
    parentTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    dependencies: [taskDependencySchema],
    labels: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TaskLabel',
      },
    ],
    attachmentCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    order: {
      type: Number,
      default: 0,
    },
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    watchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly'],
      },
      interval: Number,
      endDate: Date,
      daysOfWeek: [Number],
      dayOfMonth: Number,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ projectId: 1, taskNumber: 1 }, { unique: true });
taskSchema.index({ projectId: 1, milestoneId: 1 });
taskSchema.index({ assigneeIds: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ parentTaskId: 1 });
taskSchema.index({ title: 'text', description: 'text' });

// Virtual for subtask count
taskSchema.virtual('subtaskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'parentTaskId',
  count: true,
});

// Virtual for completed subtask count
taskSchema.virtual('completedSubtaskCount').get(function () {
  // This is computed when loading subtasks
  return this._completedSubtaskCount || 0;
});

// Virtual to check if overdue
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  if (this.status === TASK_STATUS.COMPLETED || this.status === TASK_STATUS.CLOSED) {
    return false;
  }
  return new Date(this.dueDate) < new Date();
});

// Virtual for task key (e.g., PROJ-123)
taskSchema.virtual('taskKey').get(function () {
  return this._taskKey || `TASK-${this.taskNumber}`;
});

// Pre-save middleware to generate task number
taskSchema.pre('save', async function (next) {
  if (this.isNew) {
    const Task = mongoose.model('Task');
    const lastTask = await Task.findOne({ projectId: this.projectId })
      .sort({ taskNumber: -1 })
      .select('taskNumber');

    this.taskNumber = lastTask ? lastTask.taskNumber + 1 : 1;
  }

  // Update completedAt when status changes to completed
  if (this.isModified('status')) {
    if (this.status === TASK_STATUS.COMPLETED || this.status === TASK_STATUS.CLOSED) {
      this.completedAt = this.completedAt || new Date();
    } else {
      this.completedAt = undefined;
    }
  }

  next();
});

// Method to add assignee
taskSchema.methods.addAssignee = async function (userId) {
  if (!this.assigneeIds.includes(userId)) {
    this.assigneeIds.push(userId);
    return this.save();
  }
  return this;
};

// Method to remove assignee
taskSchema.methods.removeAssignee = async function (userId) {
  this.assigneeIds = this.assigneeIds.filter(
    (id) => id.toString() !== userId.toString()
  );
  return this.save();
};

// Method to add dependency
taskSchema.methods.addDependency = async function (dependsOnTaskId, type = DEPENDENCY_TYPES.FINISH_TO_START) {
  const existingDep = this.dependencies.find(
    (d) => d.dependsOnTaskId.toString() === dependsOnTaskId.toString()
  );

  if (!existingDep) {
    this.dependencies.push({ dependsOnTaskId, type });
    return this.save();
  }
  return this;
};

// Method to remove dependency
taskSchema.methods.removeDependency = async function (dependsOnTaskId) {
  this.dependencies = this.dependencies.filter(
    (d) => d.dependsOnTaskId.toString() !== dependsOnTaskId.toString()
  );
  return this.save();
};

// Method to update progress based on subtasks
taskSchema.methods.updateProgressFromSubtasks = async function () {
  const Task = mongoose.model('Task');
  const subtasks = await Task.find({ parentTaskId: this._id });

  if (subtasks.length === 0) return this;

  const completedSubtasks = subtasks.filter(
    (t) => t.status === TASK_STATUS.COMPLETED || t.status === TASK_STATUS.CLOSED
  ).length;

  this.progress = Math.round((completedSubtasks / subtasks.length) * 100);
  return this.save();
};

// Static method to get tasks by project with filters
taskSchema.statics.getByProject = async function (projectId, options = {}) {
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
    sortOrder = -1,
  } = options;

  const query = { projectId };

  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assigneeId) query.assigneeIds = assigneeId;
  if (milestoneId) query.milestoneId = milestoneId;
  if (parentTaskId !== undefined) {
    query.parentTaskId = parentTaskId || { $exists: false };
  }
  if (search) {
    query.$text = { $search: search };
  }

  const tasks = await this.find(query)
    .populate('assigneeIds', 'firstName lastName email avatar')
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('milestoneId', 'name')
    .populate('labels', 'name color')
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await this.countDocuments(query);

  return { tasks, total };
};

// Static method to get overdue tasks
taskSchema.statics.getOverdueTasks = async function (projectId, userId = null) {
  const query = {
    dueDate: { $lt: new Date() },
    status: { $nin: [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED] },
  };

  if (projectId) query.projectId = projectId;
  if (userId) query.assigneeIds = userId;

  return this.find(query)
    .populate('projectId', 'name key')
    .populate('assigneeIds', 'firstName lastName email')
    .sort({ dueDate: 1 });
};

module.exports = mongoose.model('Task', taskSchema);
