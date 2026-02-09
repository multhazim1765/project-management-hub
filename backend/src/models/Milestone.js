const mongoose = require('mongoose');
const { MILESTONE_STATUS, TASK_STATUS } = require('../config/constants');

const milestoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Milestone name is required'],
      trim: true,
      maxlength: [100, 'Milestone name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    startDate: {
      type: Date,
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
    },
    completedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(MILESTONE_STATUS),
      default: MILESTONE_STATUS.PENDING,
    },
    order: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#3B82F6',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
milestoneSchema.index({ projectId: 1, order: 1 });
milestoneSchema.index({ projectId: 1, status: 1 });
milestoneSchema.index({ dueDate: 1 });

// Virtual for task count
milestoneSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'milestoneId',
  count: true,
});

// Virtual for progress
milestoneSchema.virtual('progress').get(function () {
  return this._progress || 0;
});

// Virtual to check if overdue
milestoneSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  if (this.status === MILESTONE_STATUS.COMPLETED) return false;
  return new Date(this.dueDate) < new Date();
});

// Method to calculate progress from tasks
milestoneSchema.methods.calculateProgress = async function () {
  const Task = mongoose.model('Task');

  const stats = await Task.aggregate([
    { $match: { milestoneId: this._id } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: {
            $cond: [
              { $in: ['$status', [TASK_STATUS.COMPLETED, TASK_STATUS.CLOSED]] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  if (stats.length === 0 || stats[0].total === 0) {
    this._progress = 0;
  } else {
    this._progress = Math.round((stats[0].completed / stats[0].total) * 100);
  }

  return this._progress;
};

// Method to update status based on progress
milestoneSchema.methods.updateStatus = async function () {
  const progress = await this.calculateProgress();

  if (progress === 100) {
    this.status = MILESTONE_STATUS.COMPLETED;
    this.completedAt = this.completedAt || new Date();
  } else if (progress > 0) {
    this.status = MILESTONE_STATUS.IN_PROGRESS;
  } else if (this.isOverdue) {
    this.status = MILESTONE_STATUS.OVERDUE;
  } else {
    this.status = MILESTONE_STATUS.PENDING;
  }

  return this.save();
};

// Static method to get milestones with progress
milestoneSchema.statics.getWithProgress = async function (projectId) {
  const milestones = await this.find({ projectId })
    .populate('createdBy', 'firstName lastName')
    .populate('owner', 'firstName lastName')
    .sort({ order: 1, dueDate: 1 });

  for (const milestone of milestones) {
    await milestone.calculateProgress();
  }

  return milestones;
};

// Static method to get upcoming milestones
milestoneSchema.statics.getUpcoming = async function (projectId, days = 7) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return this.find({
    projectId,
    dueDate: { $lte: endDate },
    status: { $ne: MILESTONE_STATUS.COMPLETED },
  }).sort({ dueDate: 1 });
};

module.exports = mongoose.model('Milestone', milestoneSchema);
