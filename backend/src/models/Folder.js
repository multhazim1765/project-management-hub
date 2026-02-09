const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Folder name is required'],
      trim: true,
      maxlength: [100, 'Folder name cannot exceed 100 characters'],
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Folder',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    color: {
      type: String,
      default: '#6B7280',
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    path: {
      type: String,
      default: '/',
    },
    depth: {
      type: Number,
      default: 0,
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
folderSchema.index({ projectId: 1, parentFolderId: 1 });
folderSchema.index({ projectId: 1, path: 1 });
folderSchema.index({ projectId: 1, name: 1, parentFolderId: 1 }, { unique: true });

// Virtual for document count
folderSchema.virtual('documentCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'folderId',
  count: true,
  match: { isDeleted: false },
});

// Virtual for subfolder count
folderSchema.virtual('subfolderCount', {
  ref: 'Folder',
  localField: '_id',
  foreignField: 'parentFolderId',
  count: true,
  match: { isDeleted: false },
});

// Pre-save to update path and depth
folderSchema.pre('save', async function (next) {
  if (this.isModified('parentFolderId') || this.isNew) {
    if (this.parentFolderId) {
      const parentFolder = await mongoose.model('Folder').findById(this.parentFolderId);
      if (parentFolder) {
        this.path = `${parentFolder.path}${parentFolder._id}/`;
        this.depth = parentFolder.depth + 1;
      }
    } else {
      this.path = '/';
      this.depth = 0;
    }
  }
  next();
});

// Method to get full path with names
folderSchema.methods.getFullPath = async function () {
  const folders = [];
  let currentFolder = this;

  while (currentFolder) {
    folders.unshift({ id: currentFolder._id, name: currentFolder.name });
    if (currentFolder.parentFolderId) {
      currentFolder = await mongoose.model('Folder').findById(currentFolder.parentFolderId);
    } else {
      break;
    }
  }

  return folders;
};

// Method to move folder
folderSchema.methods.moveTo = async function (newParentId) {
  // Prevent moving to itself or its descendants
  if (newParentId) {
    const newParent = await mongoose.model('Folder').findById(newParentId);
    if (newParent && newParent.path.includes(this._id.toString())) {
      throw new Error('Cannot move folder to its own descendant');
    }
  }

  this.parentFolderId = newParentId;
  await this.save();

  // Update all descendants' paths
  await this.updateDescendantPaths();

  return this;
};

// Method to update descendant paths
folderSchema.methods.updateDescendantPaths = async function () {
  const Folder = mongoose.model('Folder');
  const descendants = await Folder.find({
    projectId: this.projectId,
    path: { $regex: `^${this.path}${this._id}/` },
    isDeleted: false,
  });

  for (const descendant of descendants) {
    const parent = await Folder.findById(descendant.parentFolderId);
    if (parent) {
      descendant.path = `${parent.path}${parent._id}/`;
      descendant.depth = parent.depth + 1;
      await descendant.save();
    }
  }
};

// Method to soft delete with contents
folderSchema.methods.softDeleteWithContents = async function (userId) {
  const Folder = mongoose.model('Folder');
  const Document = mongoose.model('Document');

  // Delete subfolders recursively
  const subfolders = await Folder.find({
    projectId: this.projectId,
    path: { $regex: `^${this.path}${this._id}/` },
    isDeleted: false,
  });

  for (const subfolder of subfolders) {
    subfolder.isDeleted = true;
    subfolder.deletedAt = new Date();
    subfolder.deletedBy = userId;
    await subfolder.save();
  }

  // Delete documents in this folder and subfolders
  const folderIds = [this._id, ...subfolders.map((f) => f._id)];
  await Document.updateMany(
    { folderId: { $in: folderIds }, isDeleted: false },
    {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
    }
  );

  // Delete this folder
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Static method to get folder tree
folderSchema.statics.getTree = async function (projectId) {
  const folders = await this.find({
    projectId,
    isDeleted: false,
  })
    .populate('documentCount')
    .sort({ depth: 1, name: 1 });

  // Build tree structure
  const buildTree = (parentId = null) => {
    return folders
      .filter((f) => {
        if (parentId === null) {
          return !f.parentFolderId;
        }
        return f.parentFolderId?.toString() === parentId.toString();
      })
      .map((folder) => ({
        ...folder.toObject(),
        children: buildTree(folder._id),
      }));
  };

  return buildTree();
};

module.exports = mongoose.model('Folder', folderSchema);
