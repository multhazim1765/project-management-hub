import { useState, useEffect } from 'react';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import { documentAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function DocumentViewer({ document, onClose, onDeleted, onDownload }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    loadVersions();
  }, [document]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const response = await documentAPI.getVersions(document._id);
      setVersions(response.data.data.versions || []);
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    try {
      if (document.isLocked) {
        await documentAPI.unlock(document._id);
        toast.success('Document unlocked');
      } else {
        await documentAPI.lock(document._id);
        toast.success('Document locked');
      }
      // Refresh document
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to toggle lock');
    }
  };

  const handleRestoreVersion = async (versionNumber) => {
    if (!confirm(`Restore version ${versionNumber}?`)) return;

    try {
      await documentAPI.restoreVersion(document._id, versionNumber);
      toast.success('Version restored');
      loadVersions();
    } catch (error) {
      toast.error('Failed to restore version');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full mx-4 h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{document.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {formatFileSize(document.size)} • Uploaded {formatDate(document.createdAt)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onDownload(document)}
              className="btn-secondary flex items-center space-x-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              <span>Download</span>
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'info'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'versions'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Version History ({versions.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Description */}
              {document.description && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-600">{document.description}</p>
                </div>
              )}

              {/* Tags */}
              {document.tags && document.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Uploaded by</span>
                    <span className="text-gray-900">
                      {document.uploadedBy?.firstName} {document.uploadedBy?.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Version</span>
                    <span className="text-gray-900">v{document.currentVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">File Type</span>
                    <span className="text-gray-900">{document.mimeType}</span>
                  </div>
                  {document.downloadCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Downloads</span>
                      <span className="text-gray-900">{document.downloadCount}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lock Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {document.isLocked ? (
                    <LockClosedIcon className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <LockOpenIcon className="w-5 h-5 text-green-500" />
                  )}
                  <span className="text-sm font-medium">
                    {document.isLocked ? 'Locked' : 'Unlocked'}
                  </span>
                </div>
                <button onClick={handleLock} className="text-sm text-primary-600 hover:text-primary-700">
                  {document.isLocked ? 'Unlock Document' : 'Lock Document'}
                </button>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    onDeleted();
                  }}
                  className="text-red-600 hover:text-red-700 flex items-center space-x-2"
                >
                  <TrashIcon className="w-5 h-5" />
                  <span>Delete Document</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading versions...</div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No previous versions available
                </div>
              ) : (
                versions.map((version) => (
                  <div
                    key={version._id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-10 h-10 bg-primary-100 text-primary-700 rounded-full font-semibold">
                        v{version.version}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Version {version.version}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(version.uploadedAt)} • {formatFileSize(version.size)}
                        </p>
                        {version.changeNote && (
                          <p className="text-xs text-gray-600 mt-1">{version.changeNote}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRestoreVersion(version.version)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
