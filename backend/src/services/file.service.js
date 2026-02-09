const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class FileService {
  constructor() {
    this.storageType = process.env.FILE_STORAGE_TYPE || 'local';
    this.uploadPath = path.join(__dirname, '../../uploads');
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
  }

  /**
   * Initialize storage
   */
  async initialize() {
    if (this.storageType === 'local') {
      try {
        await fs.mkdir(this.uploadPath, { recursive: true });
        logger.info(`Upload directory created: ${this.uploadPath}`);
      } catch (error) {
        logger.error('Error creating upload directory:', error);
      }
    }
  }

  /**
   * Upload file
   */
  async uploadFile(file, options = {}) {
    const { folder = 'general', organizationId, projectId } = options;

    if (this.storageType === 's3') {
      return this.uploadToS3(file, folder, options);
    }

    return this.uploadToLocal(file, folder, options);
  }

  /**
   * Upload to local storage
   */
  async uploadToLocal(file, folder, options = {}) {
    try {
      const fileName = `${uuidv4()}${path.extname(file.originalname)}`;
      const folderPath = path.join(this.uploadPath, folder);
      const filePath = path.join(folderPath, fileName);

      // Create folder if it doesn't exist
      await fs.mkdir(folderPath, { recursive: true });

      // Move file from temp location or write buffer
      if (file.path) {
        await fs.rename(file.path, filePath);
      } else if (file.buffer) {
        await fs.writeFile(filePath, file.buffer);
      } else {
        throw new Error('Invalid file data');
      }

      const url = `/uploads/${folder}/${fileName}`;
      const key = `${folder}/${fileName}`;

      return {
        url,
        key,
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      logger.error('Error uploading file to local storage:', error);
      throw error;
    }
  }

  /**
   * Upload to S3 (placeholder - implement with AWS SDK)
   */
  async uploadToS3(file, folder, options = {}) {
    // This would use AWS SDK to upload to S3
    // For now, fall back to local storage
    logger.warn('S3 upload not implemented, using local storage');
    return this.uploadToLocal(file, folder, options);
  }

  /**
   * Delete file
   */
  async deleteFile(key) {
    if (this.storageType === 's3') {
      return this.deleteFromS3(key);
    }

    return this.deleteFromLocal(key);
  }

  /**
   * Delete from local storage
   */
  async deleteFromLocal(key) {
    try {
      const filePath = path.join(this.uploadPath, key);
      await fs.unlink(filePath);
      logger.info(`File deleted: ${key}`);
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.warn(`File not found for deletion: ${key}`);
        return true;
      }
      logger.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Delete from S3 (placeholder)
   */
  async deleteFromS3(key) {
    logger.warn('S3 delete not implemented');
    return this.deleteFromLocal(key);
  }

  /**
   * Get file stream for download
   */
  async getFileStream(key) {
    if (this.storageType === 's3') {
      return this.getS3Stream(key);
    }

    return this.getLocalStream(key);
  }

  /**
   * Get local file stream
   */
  async getLocalStream(key) {
    const filePath = path.join(this.uploadPath, key);

    try {
      await fs.access(filePath);
      return fs.createReadStream(filePath);
    } catch (error) {
      throw new Error('File not found');
    }
  }

  /**
   * Get S3 stream (placeholder)
   */
  async getS3Stream(key) {
    return this.getLocalStream(key);
  }

  /**
   * Copy file
   */
  async copyFile(sourceKey, destFolder) {
    if (this.storageType === 's3') {
      return this.copyS3File(sourceKey, destFolder);
    }

    return this.copyLocalFile(sourceKey, destFolder);
  }

  /**
   * Copy local file
   */
  async copyLocalFile(sourceKey, destFolder) {
    try {
      const sourcePath = path.join(this.uploadPath, sourceKey);
      const fileName = path.basename(sourceKey);
      const newFileName = `${uuidv4()}${path.extname(fileName)}`;
      const destPath = path.join(this.uploadPath, destFolder, newFileName);

      await fs.mkdir(path.dirname(destPath), { recursive: true });
      await fs.copyFile(sourcePath, destPath);

      return {
        url: `/uploads/${destFolder}/${newFileName}`,
        key: `${destFolder}/${newFileName}`,
      };
    } catch (error) {
      logger.error('Error copying file:', error);
      throw error;
    }
  }

  /**
   * Copy S3 file (placeholder)
   */
  async copyS3File(sourceKey, destFolder) {
    return this.copyLocalFile(sourceKey, destFolder);
  }

  /**
   * Get file info
   */
  async getFileInfo(key) {
    if (this.storageType === 's3') {
      return this.getS3FileInfo(key);
    }

    return this.getLocalFileInfo(key);
  }

  /**
   * Get local file info
   */
  async getLocalFileInfo(key) {
    try {
      const filePath = path.join(this.uploadPath, key);
      const stats = await fs.stat(filePath);

      return {
        size: stats.size,
        modifiedAt: stats.mtime,
        createdAt: stats.birthtime,
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get S3 file info (placeholder)
   */
  async getS3FileInfo(key) {
    return this.getLocalFileInfo(key);
  }

  /**
   * Generate signed URL for download (for S3)
   */
  async getSignedUrl(key, expiresIn = 3600) {
    if (this.storageType === 's3') {
      // Would return presigned S3 URL
      return `${this.baseUrl}/api/files/${key}`;
    }

    return `/uploads/${key}`;
  }

  /**
   * Get storage usage for organization
   */
  async getStorageUsage(organizationId) {
    // This would query the database for total file sizes
    // For now, return a placeholder
    return {
      used: 0,
      limit: 1024 * 1024 * 1024, // 1GB
    };
  }
}

module.exports = new FileService();
