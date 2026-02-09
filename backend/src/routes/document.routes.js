const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const folderController = require('../controllers/folder.controller');
const {
  authenticate,
  authorizeProjectAccess,
  validateObjectId,
  documentUpload,
  handleUploadError,
  uploadLimiter,
} = require('../middleware');

// All routes require authentication
router.use(authenticate);

// ============ Project-level routes ============

// Document search in project
router.get(
  '/projects/:projectId/documents/search',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  documentController.searchDocuments
);

// Upload document to project
router.post(
  '/projects/:projectId/documents',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  uploadLimiter,
  documentUpload.single('file'),
  handleUploadError,
  documentController.uploadDocument
);

// Get documents in project
router.get(
  '/projects/:projectId/documents',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  documentController.getDocuments
);

// Create folder in project
router.post(
  '/projects/:projectId/folders',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  folderController.createFolder
);

// Get folders in project
router.get(
  '/projects/:projectId/folders',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  folderController.getFolders
);

// Get folder tree for project
router.get(
  '/projects/:projectId/folders/tree',
  validateObjectId('projectId'),
  authorizeProjectAccess,
  folderController.getFolderTree
);

// ============ Document-specific routes ============

// Get single document
router.get(
  '/documents/:id',
  validateObjectId('id'),
  documentController.getDocument
);

// Update document metadata
router.put(
  '/documents/:id',
  validateObjectId('id'),
  documentController.updateDocument
);

// Delete document
router.delete(
  '/documents/:id',
  validateObjectId('id'),
  documentController.deleteDocument
);

// Upload new version
router.post(
  '/documents/:id/versions',
  validateObjectId('id'),
  uploadLimiter,
  documentUpload.single('file'),
  handleUploadError,
  documentController.uploadVersion
);

// Get version history
router.get(
  '/documents/:id/versions',
  validateObjectId('id'),
  documentController.getVersions
);

// Restore version
router.post(
  '/documents/:id/versions/:versionNumber/restore',
  validateObjectId('id'),
  documentController.restoreVersion
);

// Download document
router.get(
  '/documents/:id/download',
  validateObjectId('id'),
  documentController.downloadDocument
);

// Lock document
router.post(
  '/documents/:id/lock',
  validateObjectId('id'),
  documentController.lockDocument
);

// Unlock document
router.post(
  '/documents/:id/unlock',
  validateObjectId('id'),
  documentController.unlockDocument
);

// ============ Folder-specific routes ============

// Get single folder
router.get(
  '/folders/:id',
  validateObjectId('id'),
  folderController.getFolder
);

// Update folder
router.put(
  '/folders/:id',
  validateObjectId('id'),
  folderController.updateFolder
);

// Move folder
router.put(
  '/folders/:id/move',
  validateObjectId('id'),
  folderController.moveFolder
);

// Delete folder
router.delete(
  '/folders/:id',
  validateObjectId('id'),
  folderController.deleteFolder
);

// Get folder contents
router.get(
  '/folders/:id/contents',
  validateObjectId('id'),
  folderController.getFolderContents
);

// Copy folder
router.post(
  '/folders/:id/copy',
  validateObjectId('id'),
  folderController.copyFolder
);

module.exports = router;
