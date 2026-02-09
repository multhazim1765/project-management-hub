const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { FILE_UPLOAD } = require('../config/constants');

/**
 * Configure storage for local file uploads
 */
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

/**
 * Memory storage for S3 uploads
 */
const memoryStorage = multer.memoryStorage();

/**
 * File filter function
 */
const fileFilter = (req, file, cb) => {
  if (FILE_UPLOAD.ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

/**
 * General file upload configuration
 */
const upload = multer({
  storage: process.env.FILE_STORAGE_TYPE === 's3' ? memoryStorage : localStorage,
  limits: {
    fileSize: FILE_UPLOAD.MAX_SIZE,
    files: 10,
  },
  fileFilter,
});

/**
 * Avatar upload configuration (images only, smaller size)
 */
const avatarUpload = multer({
  storage: process.env.FILE_STORAGE_TYPE === 's3' ? memoryStorage : localStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatars'), false);
    }
  },
});

/**
 * Document upload configuration
 */
const documentUpload = multer({
  storage: process.env.FILE_STORAGE_TYPE === 's3' ? memoryStorage : localStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for documents
    files: 5,
  },
  fileFilter,
});

/**
 * Handle multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};

module.exports = {
  upload,
  avatarUpload,
  documentUpload,
  handleUploadError,
};
