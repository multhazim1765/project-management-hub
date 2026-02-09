const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },
    hours: {
      type: Number,
      required: [true, 'Hours is required'],
      min: [0.01, 'Hours must be greater than 0'],
      max: [24, 'Hours cannot exceed 24'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    billable: {
      type: Boolean,
      default: true,
    },
    billingRate: {
      type: Number,
      min: 0,
    },
    approved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectedReason: {
      type: String,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    source: {
      type: String,
      enum: ['manual', 'timer'],
      default: 'manual',
    },
    timerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Timer',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
timeEntrySchema.index({ userId: 1, date: 1 });
timeEntrySchema.index({ projectId: 1, date: 1 });
timeEntrySchema.index({ taskId: 1 });
timeEntrySchema.index({ status: 1 });
timeEntrySchema.index({ date: 1 });

// Virtual for total amount
timeEntrySchema.virtual('totalAmount').get(function () {
  if (!this.billable || !this.billingRate) return 0;
  return this.hours * this.billingRate;
});

// Static method to get weekly timesheet
timeEntrySchema.statics.getWeeklyTimesheet = async function (userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'projectId',
        foreignField: '_id',
        as: 'project',
      },
    },
    {
      $lookup: {
        from: 'tasks',
        localField: 'taskId',
        foreignField: '_id',
        as: 'task',
      },
    },
    {
      $unwind: { path: '$project', preserveNullAndEmptyArrays: true },
    },
    {
      $unwind: { path: '$task', preserveNullAndEmptyArrays: true },
    },
    {
      $group: {
        _id: {
          projectId: '$projectId',
          taskId: '$taskId',
        },
        projectName: { $first: '$project.name' },
        taskTitle: { $first: '$task.title' },
        entries: {
          $push: {
            _id: '$_id',
            date: '$date',
            hours: '$hours',
            description: '$description',
            billable: '$billable',
            status: '$status',
          },
        },
        totalHours: { $sum: '$hours' },
        billableHours: {
          $sum: { $cond: ['$billable', '$hours', 0] },
        },
      },
    },
    {
      $sort: { projectName: 1, taskTitle: 1 },
    },
  ]);
};

// Static method to get time summary by project
timeEntrySchema.statics.getProjectSummary = async function (projectId, startDate, endDate) {
  const match = { projectId: new mongoose.Types.ObjectId(projectId) };
  if (startDate && endDate) {
    match.date = { $gte: startDate, $lte: endDate };
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$userId',
        totalHours: { $sum: '$hours' },
        billableHours: {
          $sum: { $cond: ['$billable', '$hours', 0] },
        },
        entryCount: { $sum: 1 },
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
        totalHours: 1,
        billableHours: 1,
        entryCount: 1,
      },
    },
    { $sort: { totalHours: -1 } },
  ]);
};

// Static method to get pending approvals
timeEntrySchema.statics.getPendingApprovals = async function (projectIds) {
  return this.find({
    projectId: { $in: projectIds },
    status: 'pending',
  })
    .populate('userId', 'firstName lastName email')
    .populate('projectId', 'name')
    .populate('taskId', 'title')
    .sort({ date: -1 });
};

module.exports = mongoose.model('TimeEntry', timeEntrySchema);
