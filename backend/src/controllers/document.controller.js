const { Document, Folder, Project } = require('../models');
const ApiResponse = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware');
const { getPagination } = require('../utils/helpers');
const fileService = require('../services/file.service');
const logger = require('../utils/logger');

/**
 * @desc    Upload document to project
 * @route   POST /api/projects/:projectId/documents
 * @access  Private (Project Member)
 */
const uploadDocument = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { name, description, folderId, tags } = req.body;

  // Verify project exists
  const project = await Project.findById(projectId);
  if (!project) {
    return ApiResponse.notFound(res, 'Project not found');
  }

  // Verify folder exists if provided
  if (folderId) {
    const folder = await Folder.findOne({ _id: folderId, projectId });
    if (!folder) {
      return ApiResponse.notFound(res, 'Folder not found');
    }
  }

  // Check if file was uploaded
  if (!req.file) {
    return ApiResponse.badRequest(res, 'No file uploaded');
  }

  // Upload file using file service
  const fileData = await fileService.uploadFile(req.file, {
    folder: `projects/${projectId}/documents`,
    organizationId: req.organizationId,
    projectId,
  });

  // Create document record
  const document = new Document({
    name: name || req.file.originalname,
    description,
    projectId,
    folderId,
    uploadedBy: req.userId,
    url: fileData.url,
    key: fileData.key,
    size: fileData.size,
    mimeType: fileData.mimeType,
    tags: tags ? tags.split(',').map(t => t.trim()) : [],
    versions: [
      {
        version: 1,
        url: fileData.url,
        key: fileData.key,
        size: fileData.size,
        uploadedBy: req.userId,
      },
    ],
  });

  await document.save();

  await document.populate('uploadedBy', 'firstName lastName email avatar');

  ApiResponse.created(res, { document }, 'Document uploaded successfully');
});

/**
 * @desc    Get documents in project or folder
 * @route   GET /api/projects/:projectId/documents
 * @access  Private (Project Member)
 */
const getDocuments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { folderId, search, tags, page = 1, limit = 20 } = req.query;

  const query = {
    projectId,
    isDeleted: false,
  };

  // Filter by folder
  if (folderId) {
    query.folderId = folderId;
  } else if (folderId === null || folderId === 'null') {
    query.folderId = { $exists: false };
  }

  // Search by name or description
  if (search) {
    query.$text = { $search: search };
  }

  // Filter by tags
  if (tags) {
    query.tags = { $in: tags.split(',').map(t => t.trim()) };
  }

  const total = await Document.countDocuments(query);
  const pagination = getPagination(page, limit, total);

  const documents = await Document.find(query)
    .populate('uploadedBy', 'firstName lastName email avatar')
    .populate('lastAccessedBy', 'firstName lastName')
    .populate('folderId', 'name path')
    .sort({ name: 1 })
    .skip(pagination.skip)
    .limit(pagination.perPage);

  ApiResponse.paginated(res, { documents }, pagination);
});

/**
 * @desc    Get single document
 * @route   GET /api/documents/:id
 * @access  Private (Project Member)
 */
const getDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .populate('uploadedBy', 'firstName lastName email avatar')
    .populate('lastAccessedBy', 'firstName lastName email avatar')
    .populate('folderId', 'name path')
    .populate('versions.uploadedBy', 'firstName lastName email avatar');

  if (!document) {
    return ApiResponse.notFound(res, 'Document not found');
  }

  ApiResponse.success(res, { document });
});

/**
 * @desc    Update document metadata
 * @route   PUT /api/documents/:id
 * @access  Private (Project Member)
 */
const updateDocument = asyncHandler(async (req, res) => {
  const { name, description, tags, folderId } = req.body;

  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!document) {
    return ApiResponse.notFound(res, 'Document not found');
  }

  // Check if document is locked by another user
  if (document.isLocked && document.lockedBy.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Document is locked by another user');
  }

  // Update fields
  if (name) document.name = name;
  if (description !== undefined) document.description = description;
  if (tags) document.tags = tags;
  if (folderId !== undefined) {
    // Verify folder exists
    if (folderId) {
      const folder = await Folder.findOne({
        _id: folderId,
        projectId: document.projectId,
      });
      if (!folder) {
        return ApiResponse.notFound(res, 'Folder not found');
      }
    }
    document.folderId = folderId || undefined;
  }

  await document.save();

  await document.populate([
    { path: 'uploadedBy', select: 'firstName lastName email avatar' },
    { path: 'folderId', select: 'name path' },
  ]);

  ApiResponse.success(res, { document }, 'Document updated');
});

/**
 * @desc    Delete document (soft delete)
 * @route   DELETE /api/documents/:id
 * @access  Private (Project Member)
 */
const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!document) {
    return ApiResponse.notFound(res, 'Document not found');
  }

  // Soft delete
  await document.softDelete(req.userId);

  ApiResponse.success(res, null, 'Document deleted');
});

/**
 * @desc    Upload new version of document
 * @route   POST /api/documents/:id/versions
 * @access  Private (Project Member)
 */
const uploadVersion = asyncHandler(async (req, res) => {
  const { changeNote } = req.body;

  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!document) {
    return ApiResponse.notFound(res, 'Document not found');
  }

  // Check if document is locked by another user
  if (document.isLocked && document.lockedBy.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Document is locked by another user');
  }

  // Check if file was uploaded
  if (!req.file) {
    return ApiResponse.badRequest(res, 'No file uploaded');
  }

  // Upload new version
  const fileData = await fileService.uploadFile(req.file, {
    folder: `projects/${document.projectId}/documents`,
    organizationId: req.organizationId,
    projectId: document.projectId,
  });

  // Add version to document
  await document.addVersion(fileData, req.userId, changeNote);

  await document.populate([
    { path: 'uploadedBy', select: 'firstName lastName email avatar' },
    { path: 'versions.uploadedBy', select: 'firstName lastName email avatar' },
  ]);

  ApiResponse.success(res, { document }, 'New version uploaded');
});

/**
 * @desc    Get version history
 * @route   GET /api/documents/:id/versions
 * @access  Private (Project Member)
 */
const getVersions = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  })
    .select('versions name currentVersion')
    .populate('versions.uploadedBy', 'firstName lastName email avatar');

  if (!document) {
    return ApiResponse.notFound(res, 'Document not found');
  }

  ApiResponse.success(res, {
    versions: document.versions,
    currentVersion: document.currentVersion,
  });
});

/**
 * @desc    Restore document version
 * @route   POST /api/documents/:id/versions/:versionNumber/restore
 * @access  Private (Project Member)
 */
const restoreVersion = asyncHandler(async (req, res) => {
  const { versionNumber } = req.params;

  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!document) {
    return ApiResponse.notFound(res, 'Document not found');
  }

  // Check if document is locked by another user
  if (document.isLocked && document.lockedBy.toString() !== req.userId) {
    return ApiResponse.forbidden(res, 'Document is locked by another user');
  }

  await document.restoreVersion(parseInt(versionNumber), req.userId);

  await document.populate([
    { path: 'uploadedBy', select: 'firstName lastName email avatar' },
    { path: 'versions.uploadedBy', select: 'firstName lastName email avatar' },
  ]);

  ApiResponse.success(res, { document }, 'Version restored');
});

/**
 * @desc    Download document
 * @route   GET /api/documents/:id/download
 * @access  Private (Project Member)
 */
const downloadDocument = asyncHandler(async (req, res) => {
  const { versionNumber } = req.query;

  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!document) {
    return ApiResponse.notFound(res, 'Document not found');
  }

  let fileKey = document.key;
  let fileName = document.name;

  // Download specific version
  if (versionNumber) {
    const version = document.versions.find(
      v => v.version === parseInt(versionNumber)
    );
    if (!version) {
      return ApiResponse.notFound(res, 'Version not found');
    }
    fileKey = version.key;
    fileName = `${document.name} (v${versionNumber})`;
  }

  // Record access
  await document.recordAccess(req.userId);

  // Get file stream
  try {
    const fileStream = await fileService.getFileStream(fileKey);

    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', document.mimeType);

    fileStream.pipe(res);
  } catch (error) {
    logger.error('Error downloading document:', error);
    return ApiResponse.error(res, 'Error downloading document');
  }
});

/**
 * @desc    Lock document for editing
 * @route   POST /api/documents/:id/lock
 * @access  Private (Project Member)
 */
const lockDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!document) {
    return ApiResponse.notFound(res, 'Document not found');
  }

  if (document.isLocked) {
    return ApiResponse.conflict(
      res,
      `Document is already locked by ${document.lockedBy}`
    );
  }

  await document.lock(req.userId);

  await document.populate('lockedBy', 'firstName lastName email');

  ApiResponse.success(res, { document }, 'Document locked');
});

/**
 * @desc    Unlock document
 * @route   POST /api/documents/:id/unlock
 * @access  Private (Project Member)
 */
const unlockDocument = asyncHandler(async (req, res) => {
  const document = await Document.findOne({
    _id: req.params.id,
    isDeleted: false,
  });

  if (!document) {
    return ApiResponse.notFound(res, 'Document not found');
  }

  if (!document.isLocked) {
    return ApiResponse.badRequest(res, 'Document is not locked');
  }

  // Only the user who locked it or an admin can unlock
  if (
    document.lockedBy.toString() !== req.userId &&
    req.user.role !== 'project_admin' &&
    req.user.role !== 'super_admin'
  ) {
    return ApiResponse.forbidden(
      res,
      'You do not have permission to unlock this document'
    );
  }

  await document.unlock();

  ApiResponse.success(res, { document }, 'Document unlocked');
});

/**
 * @desc    Search documents across project
 * @route   GET /api/projects/:projectId/documents/search
 * @access  Private (Project Member)
 */
const searchDocuments = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { q, page = 1, limit = 20 } = req.query;

  if (!q) {
    return ApiResponse.badRequest(res, 'Search query is required');
  }

  const query = {
    projectId,
    isDeleted: false,
    $text: { $search: q },
  };

  const total = await Document.countDocuments(query);
  const pagination = getPagination(page, limit, total);

  const documents = await Document.find(query, { score: { $meta: 'textScore' } })
    .populate('uploadedBy', 'firstName lastName email avatar')
    .populate('folderId', 'name path')
    .sort({ score: { $meta: 'textScore' } })
    .skip(pagination.skip)
    .limit(pagination.perPage);

  ApiResponse.paginated(res, { documents }, pagination);
});

module.exports = {
  uploadDocument,
  getDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  uploadVersion,
  getVersions,
  restoreVersion,
  downloadDocument,
  lockDocument,
  unlockDocument,
  searchDocuments,
};
