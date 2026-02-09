const mongoose = require('mongoose');
const { ENTITY_TYPES } = require('../config/constants');

const attachmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: [true, 'File URL is required'],
    },
    key: {
      type: String,
      required: true, // Storage key for S3 or local path
    },
    size: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    uploadedBy: {
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
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    thumbnail: {
      type: String,
    },
    metadata: {
      width: Number,
      height: Number,
      duration: Number, // For videos/audio
      pages: Number, // For PDFs
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,
    deletedBy: {
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
attachmentSchema.index({ entityType: 1, entityId: 1 });
attachmentSchema.index({ projectId: 1 });
attachmentSchema.index({ uploadedBy: 1 });
attachmentSchema.index({ mimeType: 1 });

// Virtual for formatted file size
attachmentSchema.virtual('formattedSize').get(function () {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(this.size) / Math.log(1024)), 10);
  return `${Math.round(this.size / Math.pow(1024, i), 2)} ${sizes[i]}`;
});

// Virtual for file type category
attachmentSchema.virtual('fileCategory').get(function () {
  if (this.mimeType.startsWith('image/')) return 'image';
  if (this.mimeType.startsWith('video/')) return 'video';
  if (this.mimeType.startsWith('audio/')) return 'audio';
  if (this.mimeType === 'application/pdf') return 'pdf';
  if (
    this.mimeType.includes('word') ||
    this.mimeType.includes('document')
  )
    return 'document';
  if (
    this.mimeType.includes('excel') ||
    this.mimeType.includes('spreadsheet')
  )
    return 'spreadsheet';
  return 'other';
});

// Method to soft delete
attachmentSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Static method to get attachments for entity
attachmentSchema.statics.getForEntity = async function (entityType, entityId) {
  return this.find({
    entityType,
    entityId,
    isDeleted: false,
  })
    .populate('uploadedBy', 'firstName lastName email avatar')
    .sort({ createdAt: -1 });
};

// Static method to get attachments for project
attachmentSchema.statics.getForProject = async function (projectId, options = {}) {
  const { fileType, page = 1, limit = 20 } = options;

  const query = { projectId, isDeleted: false };
  if (fileType) {
    if (fileType === 'image') {
      query.mimeType = { $regex: /^image\// };
    } else if (fileType === 'document') {
      query.mimeType = {
        $in: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      };
    }
  }

  return this.find(query)
    .populate('uploadedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Static method to calculate storage used
attachmentSchema.statics.getStorageUsed = async function (projectId) {
  const result = await this.aggregate([
    { $match: { projectId: new mongoose.Types.ObjectId(projectId), isDeleted: false } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } },
  ]);

  return result.length > 0 ? result[0].totalSize : 0;
};

module.exports = mongoose.model('Attachment', attachmentSchema);
