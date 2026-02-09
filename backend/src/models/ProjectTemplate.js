const mongoose = require('mongoose');

const defaultTaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    estimatedHours: Number,
    order: Number,
    parentIndex: Number, // Reference to parent task in the array for subtasks
  },
  { _id: false }
);

const defaultMilestoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    daysFromStart: {
      type: Number,
      required: true,
    },
    order: Number,
    taskIndices: [Number], // References to tasks in defaultTasks array
  },
  { _id: false }
);

const projectTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [100, 'Template name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      enum: ['software', 'marketing', 'design', 'hr', 'finance', 'operations', 'other'],
      default: 'other',
    },
    defaultTasks: [defaultTaskSchema],
    defaultMilestones: [defaultMilestoneSchema],
    defaultLabels: [
      {
        name: String,
        color: String,
      },
    ],
    settings: {
      defaultDuration: {
        type: Number,
        default: 30, // days
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
    usageCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectTemplateSchema.index({ organizationId: 1 });
projectTemplateSchema.index({ isGlobal: 1 });
projectTemplateSchema.index({ category: 1 });
projectTemplateSchema.index({ isActive: 1 });

// Static method to get available templates for organization
projectTemplateSchema.statics.getAvailableTemplates = async function (organizationId) {
  return this.find({
    $or: [
      { organizationId },
      { isGlobal: true },
    ],
    isActive: true,
  }).sort({ usageCount: -1, name: 1 });
};

// Method to increment usage count
projectTemplateSchema.methods.incrementUsage = async function () {
  this.usageCount += 1;
  return this.save();
};

module.exports = mongoose.model('ProjectTemplate', projectTemplateSchema);
