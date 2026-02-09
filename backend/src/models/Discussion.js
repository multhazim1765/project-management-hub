const mongoose = require('mongoose');

const discussionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Discussion title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Discussion content is required'],
      maxlength: [10000, 'Content cannot exceed 10000 characters'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['general', 'announcement', 'question', 'idea', 'feedback'],
      default: 'general',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attachment',
      },
    ],
    viewCount: {
      type: Number,
      default: 0,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    lastActivityBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
discussionSchema.index({ projectId: 1, isPinned: -1, lastActivityAt: -1 });
discussionSchema.index({ projectId: 1, category: 1 });
discussionSchema.index({ createdBy: 1 });
discussionSchema.index({ title: 'text', content: 'text' });

// Virtual for comment count
discussionSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'entityId',
  count: true,
  match: { entityType: 'discussion', isDeleted: false },
});

// Pre-save to update lastActivity
discussionSchema.pre('save', function (next) {
  if (this.isNew) {
    this.participants = [this.createdBy];
    this.lastActivityBy = this.createdBy;
  }
  next();
});

// Method to increment view count
discussionSchema.methods.incrementViews = async function () {
  this.viewCount += 1;
  return this.save();
};

// Method to add participant
discussionSchema.methods.addParticipant = async function (userId) {
  if (!this.participants.includes(userId)) {
    this.participants.push(userId);
    return this.save();
  }
  return this;
};

// Method to update last activity
discussionSchema.methods.updateActivity = async function (userId) {
  this.lastActivityAt = new Date();
  this.lastActivityBy = userId;
  await this.addParticipant(userId);
  return this.save();
};

// Static method to get discussions with stats
discussionSchema.statics.getForProject = async function (projectId, options = {}) {
  const { category, page = 1, limit = 20, search } = options;

  const query = { projectId };
  if (category) query.category = category;
  if (search) query.$text = { $search: search };

  return this.find(query)
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('lastActivityBy', 'firstName lastName')
    .populate('commentCount')
    .sort({ isPinned: -1, lastActivityAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

module.exports = mongoose.model('Discussion', discussionSchema);
