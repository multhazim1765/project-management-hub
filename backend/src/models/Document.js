const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema(
  {
    version: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    changeNote: {
      type: String,
      maxlength: [500, 'Change note cannot exceed 500 characters'],
    },
  },
  { _id: true }
);

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Document name is required'],
      trim: true,
      maxlength: [200, 'Document name cannot exceed 200 characters'],
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
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    versions: [documentVersionSchema],
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    metadata: {
      width: Number,
      height: Number,
      pages: Number,
      duration: Number,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    permissions: {
      visibility: {
        type: String,
        enum: ['public', 'members', 'restricted'],
        default: 'members',
      },
      allowedUsers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      allowedRoles: [String],
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: Date,
    lastAccessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lockedAt: Date,
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
documentSchema.index({ projectId: 1, folderId: 1 });
documentSchema.index({ projectId: 1, name: 1 });
documentSchema.index({ uploadedBy: 1 });
documentSchema.index({ tags: 1 });
documentSchema.index({ name: 'text', description: 'text' });

// Virtual for file extension
documentSchema.virtual('extension').get(function () {
  const parts = this.name.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
});

// Virtual for formatted size
documentSchema.virtual('formattedSize').get(function () {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (this.size === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(this.size) / Math.log(1024)), 10);
  return `${Math.round(this.size / Math.pow(1024, i), 2)} ${sizes[i]}`;
});

// Method to add new version
documentSchema.methods.addVersion = async function (fileData, userId, changeNote) {
  const newVersion = this.currentVersion + 1;

  // Archive current version
  this.versions.push({
    version: this.currentVersion,
    url: this.url,
    key: this.key,
    size: this.size,
    uploadedBy: this.uploadedBy,
    uploadedAt: this.updatedAt,
  });

  // Update to new version
  this.currentVersion = newVersion;
  this.url = fileData.url;
  this.key = fileData.key;
  this.size = fileData.size;
  this.uploadedBy = userId;

  if (changeNote) {
    this.versions[this.versions.length - 1].changeNote = changeNote;
  }

  return this.save();
};

// Method to restore version
documentSchema.methods.restoreVersion = async function (versionNumber, userId) {
  const version = this.versions.find((v) => v.version === versionNumber);
  if (!version) {
    throw new Error('Version not found');
  }

  // Archive current as new version
  this.versions.push({
    version: this.currentVersion,
    url: this.url,
    key: this.key,
    size: this.size,
    uploadedBy: this.uploadedBy,
    uploadedAt: this.updatedAt,
    changeNote: `Restored from version ${versionNumber}`,
  });

  // Restore the old version
  this.currentVersion = this.versions.length + 1;
  this.url = version.url;
  this.key = version.key;
  this.size = version.size;
  this.uploadedBy = userId;

  return this.save();
};

// Method to lock document
documentSchema.methods.lock = async function (userId) {
  this.isLocked = true;
  this.lockedBy = userId;
  this.lockedAt = new Date();
  return this.save();
};

// Method to unlock document
documentSchema.methods.unlock = async function () {
  this.isLocked = false;
  this.lockedBy = undefined;
  this.lockedAt = undefined;
  return this.save();
};

// Method to record access
documentSchema.methods.recordAccess = async function (userId) {
  this.downloadCount += 1;
  this.lastAccessedAt = new Date();
  this.lastAccessedBy = userId;
  return this.save();
};

// Method to soft delete
documentSchema.methods.softDelete = async function (userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Static method to get documents for folder
documentSchema.statics.getByFolder = async function (projectId, folderId, options = {}) {
  const { page = 1, limit = 20, search } = options;

  const query = {
    projectId,
    folderId: folderId || { $exists: false },
    isDeleted: false,
  };

  if (search) {
    query.$text = { $search: search };
  }

  return this.find(query)
    .populate('uploadedBy', 'firstName lastName email avatar')
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

module.exports = mongoose.model('Document', documentSchema);
