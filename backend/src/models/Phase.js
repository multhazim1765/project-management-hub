const mongoose = require('mongoose');

const phaseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Phase name is required'],
      trim: true,
      maxlength: [100, 'Phase name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    order: {
      type: Number,
      default: 0,
    },
    color: {
      type: String,
      default: '#8B5CF6',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
phaseSchema.index({ projectId: 1, order: 1 });

// Virtual for task count
phaseSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'phaseId',
  count: true,
});

module.exports = mongoose.model('Phase', phaseSchema);
