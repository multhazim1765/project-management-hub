const { Folder, Document, Project } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const { getPagination } = require('../utils/helpers');

/**
 * @desc    Create folder in project
 * @route   POST /api/projects/:projectId/folders
 * @access  Private (Project Member)
 */
const createFolder = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, parentFolderId, color } = req.body;

  // Verify project exists
  const project = await Project.findById(projectId);
  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  // Verify parent folder exists if provided
  if (parentFolderId) {
    const parentFolder = await Folder.findOne({
      _id: parentFolderId,
      projectId,
      isDeleted: false,
    });
    if (!parentFolder) {
      return ApiResponse.notFound(res, 'Parent folder not found');
    }
  }

  // Check for duplicate folder name in same parent
  const existingFolder = await Folder.findOne({
    projectId,
    parentFolderId: parentFolderId || { $exists: false },
    name,
    isDeleted: false,
  });

  if (existingFolder) {
    return ApiResponse.conflict(
      res,
      'A folder with this name already exists in this location'
    );
  }

  const folder = new Folder({
    name,
    description,
    projectId,
    parentFolderId,
    color,
    createdBy: req.userId,
  });

  await folder.save();

  await folder.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'parentFolderId', select: 'name path' },
  ]);

  ApiResponse.created(res, { folder }, 'Folder created');
});

/**
 * @desc    Get folders in project
 * @route   GET /api/projects/:projectId/folders
 * @access  Private (Project Member)
 */
const getFolders = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { parentFolderId, page = 1, limit = 50 } = req.query;

  const query = {
    projectId,
    isDeleted: false,
  };

  // Filter by parent folder
  if (parentFolderId) {
    query.parentFolderId = parentFolderId;
  } else if (parentFolderId === null || parentFolderId === 'null') {
    query.parentFolderId = { $exists: false };
  }

  const total = await Folder.countDocuments(query);
  const pagination = getPagination(page, limit, total);

  const folders = await Folder.find(query)
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('parentFolderId', 'name')
    .populate('documentCount')
    .populate('subfolderCount')
    .sort({ name: 1 })
    .skip(pagination.skip)
    .limit(pagination.perPage);

  ApiResponse.paginated(res, { folders }, pagination);
});

/**
 * @desc    Get folder tree structure
 * @route   GET /api/projects/:projectId/folders/tree
 * @access  Private (Project Member)
 */
const getFolderTree = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const tree = await Folder.getTree(projectId);

  ApiResponse.success(res, { tree });
});

/**
 * @desc    Get single folder
 * @route   GET /api/folders/:id
 * @access  Private (Project Member)
 */
const getFolder = asyncHandler(async (req, res) => {
  const folder = await Folder.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('parentFolderId', 'name path')
    .populate('documentCount')
    .populate('subfolderCount');

  if (!folder) {
    return ApiResponse.notFound(res, 'Folder not found');
  }

  // Get breadcrumb path
  const breadcrumb = await folder.getFullPath();

  ApiResponse.success(res, { folder: { ...folder.toObject(), breadcrumb } });
});

/**
 * @desc    Update folder
 * @route   PUT /api/folders/:id
 * @access  Private (Project Member)
 */
const updateFolder = asyncHandler(async (req, res) => {
  const { name, description, color } = req.body;

  const folder = await Folder.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!folder) {
    return ApiResponse.notFound(res, 'Folder not found');
  }

  // Check for duplicate name if renaming
  if (name && name !== folder.name) {
    const existingFolder = await Folder.findOne({
      projectId: folder.projectId,
      parentFolderId: folder.parentFolderId || { $exists: false },
      name,
      isDeleted: false,
      _id: { $ne: folder._id },
    });

    if (existingFolder) {
      return ApiResponse.conflict(
        res,
        'A folder with this name already exists in this location'
      );
    }

    folder.name = name;
  }

  if (description !== undefined) folder.description = description;
  if (color) folder.color = color;

  await folder.save();

  await folder.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'parentFolderId', select: 'name path' },
  ]);

  ApiResponse.success(res, { folder }, 'Folder updated');
});

/**
 * @desc    Move folder to different parent
 * @route   PUT /api/folders/:id/move
 * @access  Private (Project Member)
 */
const moveFolder = asyncHandler(async (req, res) => {
  const { parentFolderId } = req.body;

  const folder = await Folder.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!folder) {
    return ApiResponse.notFound(res, 'Folder not found');
  }

  // Verify new parent folder exists if provided
  if (parentFolderId) {
    const parentFolder = await Folder.findOne({
      _id: parentFolderId,
      projectId: folder.projectId,
      isDeleted: false,
    });
    if (!parentFolder) {
      return ApiResponse.notFound(res, 'Parent folder not found');
    }

    // Prevent circular references
    if (parentFolder.path.includes(folder._id.toString())) {
      return ApiResponse.badRequest(
        res,
        'Cannot move folder to its own descendant'
      );
    }
  }

  // Check for duplicate name in new location
  const existingFolder = await Folder.findOne({
    projectId: folder.projectId,
    parentFolderId: parentFolderId || { $exists: false },
    name: folder.name,
    isDeleted: false,
    _id: { $ne: folder._id },
  });

  if (existingFolder) {
    return ApiResponse.conflict(
      res,
      'A folder with this name already exists in the destination'
    );
  }

  await folder.moveTo(parentFolderId);

  await folder.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'parentFolderId', select: 'name path' },
  ]);

  ApiResponse.success(res, { folder }, 'Folder moved');
});

/**
 * @desc    Delete folder (soft delete)
 * @route   DELETE /api/folders/:id
 * @access  Private (Project Member)
 */
const deleteFolder = asyncHandler(async (req, res) => {
  const { recursive } = req.query;

  const folder = await Folder.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!folder) {
    return ApiResponse.notFound(res, 'Folder not found');
  }

  if (recursive === 'true') {
    // Delete folder and all contents
    await folder.softDeleteWithContents(req.userId);
  } else {
    // Check if folder has subfolders or documents
    const subfolderCount = await Folder.countDocuments({
      parentFolderId: folder._id,
      isDeleted: false,
    });

    const documentCount = await Document.countDocuments({
      folderId: folder._id,
      isDeleted: false,
    });

    if (subfolderCount > 0 || documentCount > 0) {
      return ApiResponse.badRequest(
        res,
        'Cannot delete folder with contents. Use recursive=true to delete all contents.'
      );
    }

    // Delete empty folder
    folder.isDeleted = true;
    folder.deletedAt = new Date();
    folder.deletedBy = req.userId;
    await folder.save();
  }

  ApiResponse.success(res, null, 'Folder deleted');
});

/**
 * @desc    Get folder contents (subfolders and documents)
 * @route   GET /api/folders/:id/contents
 * @access  Private (Project Member)
 */
const getFolderContents = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;

  const folder = await Folder.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!folder) {
    return ApiResponse.notFound(res, 'Folder not found');
  }

  // Get subfolders
  const subfolders = await Folder.find({
    parentFolderId: folder._id,
    isDeleted: false,
  })
    .populate('createdBy', 'firstName lastName email avatar')
    .populate('documentCount')
    .populate('subfolderCount')
    .sort({ name: 1 });

  // Get documents
  const query = { folderId: folder._id, isDeleted: false };
  const total = await Document.countDocuments(query);
  const pagination = getPagination(page, limit, total);

  const documents = await Document.find(query)
    .populate('uploadedBy', 'firstName lastName email avatar')
    .sort({ name: 1 })
    .skip(pagination.skip)
    .limit(pagination.perPage);

  // Get breadcrumb
  const breadcrumb = await folder.getFullPath();

  ApiResponse.success(res, {
    folder: {
      ...folder.toObject(),
      breadcrumb,
    },
    subfolders,
    documents,
    pagination,
  });
});

/**
 * @desc    Copy folder
 * @route   POST /api/folders/:id/copy
 * @access  Private (Project Member)
 */
const copyFolder = asyncHandler(async (req, res) => {
  const { destinationParentId, newName } = req.body;

  const sourceFolder = await Folder.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!sourceFolder) {
    return ApiResponse.notFound(res, 'Folder not found');
  }

  // Verify destination parent exists if provided
  if (destinationParentId) {
    const parentFolder = await Folder.findOne({
      _id: destinationParentId,
      projectId: sourceFolder.projectId,
      isDeleted: false,
    });
    if (!parentFolder) {
      return ApiResponse.notFound(res, 'Destination folder not found');
    }
  }

  // Create copy
  const newFolder = new Folder({
    name: newName || `${sourceFolder.name} (Copy)`,
    description: sourceFolder.description,
    projectId: sourceFolder.projectId,
    parentFolderId: destinationParentId,
    color: sourceFolder.color,
    createdBy: req.userId,
  });

  await newFolder.save();

  await newFolder.populate([
    { path: 'createdBy', select: 'firstName lastName email avatar' },
    { path: 'parentFolderId', select: 'name path' },
  ]);

  ApiResponse.created(res, { folder: newFolder }, 'Folder copied');
});

module.exports = {
  createFolder,
  getFolders,
  getFolderTree,
  getFolder,
  updateFolder,
  moveFolder,
  deleteFolder,
  getFolderContents,
  copyFolder,
};
