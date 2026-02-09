const mongoose = require('mongoose');
const { ENTITY_TYPES } = require('../config/constants');

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      maxlength: [5000, 'Comment cannot exceed 5000 characters'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    entityType: {
      type: String,
      enum: Object.values(ENTITY_TYPES),
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'entityType',
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
    },
    mentions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    attachments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Attachment',
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        emoji: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
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
commentSchema.index({ entityType: 1, entityId: 1 });
commentSchema.index({ projectId: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ parentCommentId: 1 });
commentSchema.index({ createdAt: -1 });

// Virtual for reply count
commentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentCommentId',
  count: true,
});

// Pre-save to extract mentions
commentSchema.pre('save', function (next) {
  if (this.isModified('content')) {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(this.content)) !== null) {
      if (mongoose.Types.ObjectId.isValid(match[2])) {
        mentions.push(match[2]);
      }
    }

    this.mentions = [...new Set(mentions)];

    if (!this.isNew) {
      this.isEdited = true;
      this.editedAt = new Date();
    }
  }
  next();
});

// Method to soft delete
commentSchema.methods.softDelete = async function () {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.content = '[This comment has been deleted]';
  return this.save();
};

// Method to add reaction
commentSchema.methods.addReaction = async function (userId, emoji) {
  const existingReaction = this.reactions.find(
    (r) => r.userId.toString() === userId.toString() && r.emoji === emoji
  );

  if (!existingReaction) {
    this.reactions.push({ userId, emoji });
    return this.save();
  }
  return this;
};

// Method to remove reaction
commentSchema.methods.removeReaction = async function (userId, emoji) {
  this.reactions = this.reactions.filter(
    (r) => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
  );
  return this.save();
};

// Static method to get comments with replies
commentSchema.statics.getWithReplies = async function (entityType, entityId, options = {}) {
  const { page = 1, limit = 20 } = options;

  // Get parent comments
  const comments = await this.find({
    entityType,
    entityId,
    parentCommentId: { $exists: false },
    isDeleted: false,
  })
    .populate('userId', 'firstName lastName email avatar')
    .populate('attachments')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  // Get replies for each comment
  const commentIds = comments.map((c) => c._id);
  const replies = await this.find({
    parentCommentId: { $in: commentIds },
    isDeleted: false,
  })
    .populate('userId', 'firstName lastName email avatar')
    .populate('attachments')
    .sort({ createdAt: 1 });

  // Map replies to comments
  const repliesMap = {};
  replies.forEach((reply) => {
    const parentId = reply.parentCommentId.toString();
    if (!repliesMap[parentId]) {
      repliesMap[parentId] = [];
    }
    repliesMap[parentId].push(reply);
  });

  return comments.map((comment) => ({
    ...comment.toObject(),
    replies: repliesMap[comment._id.toString()] || [],
  }));
};

module.exports = mongoose.model('Comment', commentSchema);
