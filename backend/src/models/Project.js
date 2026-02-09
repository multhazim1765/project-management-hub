const mongoose = require('mongoose');
const { PROJECT_STATUS, ROLES } = require('../config/constants');

const projectMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: [ROLES.PROJECT_MANAGER, ROLES.TEAM_MEMBER, ROLES.CLIENT],
      default: ROLES.TEAM_MEMBER,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    key: {
      type: String,
      uppercase: true,
      trim: true,
      maxlength: [10, 'Project key cannot exceed 10 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(PROJECT_STATUS),
      default: PROJECT_STATUS.ACTIVE,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    budget: {
      estimated: Number,
      spent: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: 'USD',
      },
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectTemplate',
    },
    members: [projectMemberSchema],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    color: {
      type: String,
      default: '#3B82F6',
    },
    icon: {
      type: String,
      default: 'folder',
    },
    settings: {
      isPublic: {
        type: Boolean,
        default: false,
      },
      allowClientAccess: {
        type: Boolean,
        default: false,
      },
      taskPrefix: {
        type: String,
        default: 'TASK',
      },
      defaultTaskStatus: {
        type: String,
        default: 'open',
      },
      enableTimeTracking: {
        type: Boolean,
        default: true,
      },
      enableIssueTracking: {
        type: Boolean,
        default: true,
      },
    },
    archivedAt: Date,
    archivedBy: {
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
projectSchema.index({ organizationId: 1, status: 1 });
projectSchema.index({ organizationId: 1, key: 1 }, { unique: true });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ 'members.userId': 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ name: 'text', description: 'text' });

// Virtual for task count
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'projectId',
  count: true,
});

// Virtual for milestone count
projectSchema.virtual('milestoneCount', {
  ref: 'Milestone',
  localField: '_id',
  foreignField: 'projectId',
  count: true,
});

// Pre-save middleware to generate key if not provided
projectSchema.pre('save', async function (next) {
  if (this.isNew && !this.key) {
    // Generate key from project name (first 3-4 letters uppercase)
    const words = this.name.split(' ');
    let key = '';
    if (words.length >= 2) {
      key = (words[0][0] + words[1][0] + (words[2]?.[0] || '')).toUpperCase();
    } else {
      key = this.name.substring(0, 3).toUpperCase();
    }

    // Check if key exists and append number if needed
    const Project = mongoose.model('Project');
    let counter = 1;
    let uniqueKey = key;
    while (await Project.exists({ organizationId: this.organizationId, key: uniqueKey })) {
      uniqueKey = `${key}${counter}`;
      counter++;
    }
    this.key = uniqueKey;
  }
  next();
});

// Method to add member
projectSchema.methods.addMember = async function (userId, role, addedBy) {
  const existingMember = this.members.find(
    (m) => m.userId.toString() === userId.toString()
  );

  if (existingMember) {
    existingMember.role = role;
  } else {
    this.members.push({
      userId,
      role,
      addedBy,
      addedAt: new Date(),
    });
  }

  return this.save();
};

// Method to remove member
projectSchema.methods.removeMember = async function (userId) {
  this.members = this.members.filter(
    (m) => m.userId.toString() !== userId.toString()
  );
  return this.save();
};

// Method to check if user is member
projectSchema.methods.isMember = function (userId) {
  return this.members.some((m) => m.userId.toString() === userId.toString());
};

// Method to get member role
projectSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find(
    (m) => m.userId.toString() === userId.toString()
  );
  return member?.role || null;
};

// Method to archive project
projectSchema.methods.archive = async function (userId) {
  this.status = PROJECT_STATUS.ARCHIVED;
  this.archivedAt = new Date();
  this.archivedBy = userId;
  return this.save();
};

// Method to restore project
projectSchema.methods.restore = async function () {
  this.status = PROJECT_STATUS.ACTIVE;
  this.archivedAt = undefined;
  this.archivedBy = undefined;
  return this.save();
};

// Static method to find projects for user
projectSchema.statics.findForUser = async function (userId, organizationId, options = {}) {
  const { status, page = 1, limit = 20 } = options;

  const query = {
    organizationId,
    'members.userId': userId,
  };

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('members.userId', 'firstName lastName email avatar')
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

module.exports = mongoose.model('Project', projectSchema);
