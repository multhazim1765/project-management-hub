const mongoose = require('mongoose');
const { ISSUE_STATUS, ISSUE_SEVERITY, ISSUE_TYPE, TASK_PRIORITY } = require('../config/constants');

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Issue title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [10000, 'Description cannot exceed 10000 characters'],
    },
    issueNumber: {
      type: Number,
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    severity: {
      type: String,
      enum: Object.values(ISSUE_SEVERITY),
      default: ISSUE_SEVERITY.MEDIUM,
    },
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITY),
      default: TASK_PRIORITY.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(ISSUE_STATUS),
      default: ISSUE_STATUS.OPEN,
    },
    issueType: {
      type: String,
      enum: Object.values(ISSUE_TYPE),
      default: ISSUE_TYPE.BUG,
    },
    reproducible: {
      type: String,
      enum: ['always', 'sometimes', 'rarely', 'unable', 'not_applicable'],
      default: 'not_applicable',
    },
    stepsToReproduce: {
      type: String,
      maxlength: [5000, 'Steps cannot exceed 5000 characters'],
    },
    expectedBehavior: {
      type: String,
      maxlength: [2000, 'Expected behavior cannot exceed 2000 characters'],
    },
    actualBehavior: {
      type: String,
      maxlength: [2000, 'Actual behavior cannot exceed 2000 characters'],
    },
    environment: {
      os: String,
      browser: String,
      version: String,
      device: String,
    },
    linkedTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Issue',
    },
    resolution: {
      type: String,
      enum: ['fixed', 'wont_fix', 'duplicate', 'cannot_reproduce', 'by_design', 'deferred'],
    },
    resolutionNotes: {
      type: String,
      maxlength: [2000, 'Resolution notes cannot exceed 2000 characters'],
    },
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    closedAt: Date,
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reopenedAt: Date,
    reopenedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attachment',
      },
    ],
    labels: [
      {
        type: String,
        trim: true,
      },
    ],
    watchers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    affectedVersion: String,
    fixedInVersion: String,
    dueDate: Date,
    estimatedHours: Number,
    actualHours: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
issueSchema.index({ projectId: 1, issueNumber: 1 }, { unique: true });
issueSchema.index({ projectId: 1, status: 1 });
issueSchema.index({ projectId: 1, severity: 1 });
issueSchema.index({ assignedTo: 1 });
issueSchema.index({ reportedBy: 1 });
issueSchema.index({ status: 1, priority: 1 });
issueSchema.index({ title: 'text', description: 'text' });

// Virtual for issue key
issueSchema.virtual('issueKey').get(function () {
  return `BUG-${this.issueNumber}`;
});

// Virtual to check if overdue
issueSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  if (this.status === ISSUE_STATUS.RESOLVED || this.status === ISSUE_STATUS.CLOSED) {
    return false;
  }
  return new Date(this.dueDate) < new Date();
});

// Virtual for comment count
issueSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'entityId',
  count: true,
  match: { entityType: 'issue', isDeleted: false },
});

// Pre-save middleware to generate issue number
issueSchema.pre('save', async function (next) {
  if (this.isNew) {
    const Issue = mongoose.model('Issue');
    const lastIssue = await Issue.findOne({ projectId: this.projectId })
      .sort({ issueNumber: -1 })
      .select('issueNumber');

    this.issueNumber = lastIssue ? lastIssue.issueNumber + 1 : 1;
  }

  // Update status timestamps
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case ISSUE_STATUS.RESOLVED:
        this.resolvedAt = this.resolvedAt || now;
        break;
      case ISSUE_STATUS.CLOSED:
        this.closedAt = this.closedAt || now;
        break;
      case ISSUE_STATUS.REOPENED:
        this.reopenedAt = now;
        break;
    }
  }

  next();
});

// Method to assign issue
issueSchema.methods.assign = async function (userId, assignedBy) {
  this.assignedTo = userId;
  if (this.status === ISSUE_STATUS.OPEN) {
    this.status = ISSUE_STATUS.IN_PROGRESS;
  }
  return this.save();
};

// Method to resolve issue
issueSchema.methods.resolve = async function (userId, resolution, notes) {
  this.status = ISSUE_STATUS.RESOLVED;
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  this.resolution = resolution;
  this.resolutionNotes = notes;
  return this.save();
};

// Method to close issue
issueSchema.methods.close = async function (userId) {
  this.status = ISSUE_STATUS.CLOSED;
  this.closedAt = new Date();
  this.closedBy = userId;
  return this.save();
};

// Method to reopen issue
issueSchema.methods.reopen = async function (userId) {
  this.status = ISSUE_STATUS.REOPENED;
  this.reopenedAt = new Date();
  this.reopenedBy = userId;
  this.resolvedAt = undefined;
  this.resolvedBy = undefined;
  this.closedAt = undefined;
  this.closedBy = undefined;
  return this.save();
};

// Static method to get issues with filters
issueSchema.statics.getByProject = async function (projectId, options = {}) {
  const {
    status,
    severity,
    priority,
    issueType,
    assignedTo,
    reportedBy,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = -1,
  } = options;

  const query = { projectId };

  if (status) query.status = status;
  if (severity) query.severity = severity;
  if (priority) query.priority = priority;
  if (issueType) query.issueType = issueType;
  if (assignedTo) query.assignedTo = assignedTo;
  if (reportedBy) query.reportedBy = reportedBy;
  if (search) query.$text = { $search: search };

  const issues = await this.find(query)
    .populate('reportedBy', 'firstName lastName email avatar')
    .populate('assignedTo', 'firstName lastName email avatar')
    .populate('linkedTaskId', 'title taskNumber')
    .sort({ [sortBy]: sortOrder })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await this.countDocuments(query);

  return { issues, total };
};

// Static method to get issue statistics
issueSchema.statics.getStatistics = async function (projectId) {
  return this.aggregate([
    { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', ISSUE_STATUS.OPEN] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', ISSUE_STATUS.IN_PROGRESS] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', ISSUE_STATUS.RESOLVED] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', ISSUE_STATUS.CLOSED] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', ISSUE_SEVERITY.CRITICAL] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', ISSUE_SEVERITY.HIGH] }, 1, 0] } },
      },
    },
  ]);
};

module.exports = mongoose.model('Issue', issueSchema);
