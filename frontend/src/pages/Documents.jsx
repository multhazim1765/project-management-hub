import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { documentAPI, folderAPI } from '../services/api';
import {
  FolderIcon,
  DocumentIcon,
  ArrowUpTrayIcon,
  MagnifyingGlassIcon,
  FolderPlusIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import DocumentUploadModal from '../components/Documents/DocumentUploadModal';
import CreateFolderModal from '../components/Documents/CreateFolderModal';
import DocumentViewer from '../components/Documents/DocumentViewer';
import FolderTree from '../components/Documents/FolderTree';

export default function Documents() {
  const { projectId } = useParams();
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderTree, setFolderTree] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid or list

  useEffect(() => {
    if (projectId) {
      loadFolderTree();
      loadContents();
    }
  }, [projectId, currentFolder]);

  const loadFolderTree = async () => {
    try {
      const response = await folderAPI.getTree(projectId);
      setFolderTree(response.data.data.tree || []);
    } catch (error) {
      console.error('Failed to load folder tree:', error);
    }
  };

  const loadContents = async () => {
    setLoading(true);
    try {
      if (currentFolder) {
        const response = await folderAPI.getContents(currentFolder);
        setFolders(response.data.data.subfolders || []);
        setDocuments(response.data.data.documents || []);
        setBreadcrumb(response.data.data.folder?.breadcrumb || []);
      } else {
        // Load root level
        const [foldersRes, docsRes] = await Promise.all([
          folderAPI.getByProject(projectId, { parentFolderId: 'null' }),
          documentAPI.getByProject(projectId, { folderId: 'null' }),
        ]);
        setFolders(foldersRes.data.data.folders || []);
        setDocuments(docsRes.data.data.documents || []);
        setBreadcrumb([]);
      }
    } catch (error) {
      toast.error('Failed to load contents');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folderId) => {
    setCurrentFolder(folderId);
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (folderId) => {
    setCurrentFolder(folderId || null);
    setSearchQuery('');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadContents();
      return;
    }

    setLoading(true);
    try {
      const response = await documentAPI.searchInProject(projectId, { q: searchQuery });
      setDocuments(response.data.data.documents || []);
      setFolders([]);
    } catch (error) {
      toast.error('Search failed');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await documentAPI.download(doc._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download document');
      console.error(error);
    }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) return;

    try {
      await documentAPI.delete(doc._id);
      toast.success('Document deleted');
      loadContents();
      loadFolderTree();
    } catch (error) {
      toast.error('Failed to delete document');
      console.error(error);
    }
  };

  const handleDeleteFolder = async (folder) => {
    if (!confirm(`Are you sure you want to delete folder "${folder.name}"?`)) return;

    try {
      await folderAPI.delete(folder._id, false);
      toast.success('Folder deleted');
      loadContents();
      loadFolderTree();
    } catch (error) {
      if (error.response?.data?.message?.includes('contents')) {
        const confirmRecursive = confirm(
          `Folder "${folder.name}" contains files or subfolders. Delete all contents?`
        );
        if (confirmRecursive) {
          try {
            await folderAPI.delete(folder._id, true);
            toast.success('Folder and contents deleted');
            loadContents();
            loadFolderTree();
          } catch (err) {
            toast.error('Failed to delete folder');
            console.error(err);
          }
        }
      } else {
        toast.error('Failed to delete folder');
        console.error(error);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar - Folder Tree */}
        <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Folders</h2>
          </div>
          <FolderTree
            tree={folderTree}
            currentFolder={currentFolder}
            onFolderClick={handleFolderClick}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setCreateFolderModalOpen(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <FolderPlusIcon className="w-5 h-5" />
                  <span>New Folder</span>
                </button>
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="btn-primary flex items-center space-x-2"
                >
                  <ArrowUpTrayIcon className="w-5 h-5" />
                  <span>Upload</span>
                </button>
              </div>
            </div>

            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
                <button
                  onClick={() => handleBreadcrumbClick(null)}
                  className="hover:text-primary-600 hover:underline"
                >
                  Root
                </button>
                {breadcrumb.map((crumb, index) => (
                  <div key={crumb.id} className="flex items-center space-x-2">
                    <span>/</span>
                    <button
                      onClick={() => handleBreadcrumbClick(crumb.id)}
                      className={clsx(
                        'hover:text-primary-600 hover:underline',
                        index === breadcrumb.length - 1 && 'font-medium text-gray-900'
                      )}
                    >
                      {crumb.name}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Search */}
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documents..."
                  className="input pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <button onClick={handleSearch} className="btn-primary">
                Search
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
                {/* Folders */}
                {folders.map((folder) => (
                  <div
                    key={folder._id}
                    className={clsx(
                      'bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow',
                      viewMode === 'list' && 'flex items-center justify-between'
                    )}
                    onDoubleClick={() => handleFolderClick(folder._id)}
                  >
                    <div className="flex items-center space-x-3">
                      <FolderIcon className="w-8 h-8 text-yellow-500" />
                      <div>
                        <p className="font-medium text-gray-900">{folder.name}</p>
                        {folder.description && (
                          <p className="text-sm text-gray-500 truncate">{folder.description}</p>
                        )}
                      </div>
                    </div>
                    {viewMode === 'list' && (
                      <button
                        onClick={() => handleDeleteFolder(folder)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <EllipsisVerticalIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Documents */}
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className={clsx(
                      'bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow',
                      viewMode === 'list' && 'flex items-center justify-between'
                    )}
                    onClick={() => setSelectedDocument(doc)}
                  >
                    <div className="flex items-center space-x-3">
                      <DocumentIcon className="w-8 h-8 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(doc.size)} • {formatDate(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    {viewMode === 'list' && (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(doc);
                          }}
                          className="text-sm text-primary-600 hover:text-primary-700"
                        >
                          Download
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(doc);
                          }}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {folders.length === 0 && documents.length === 0 && (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <DocumentIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No documents or folders found</p>
                    <p className="text-sm">Upload your first document to get started</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projectId={projectId}
        folderId={currentFolder}
        onUploaded={() => {
          loadContents();
          loadFolderTree();
        }}
      />

      <CreateFolderModal
        isOpen={createFolderModalOpen}
        onClose={() => setCreateFolderModalOpen(false)}
        projectId={projectId}
        parentFolderId={currentFolder}
        onCreated={() => {
          loadContents();
          loadFolderTree();
        }}
      />

      {selectedDocument && (
        <DocumentViewer
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
          onDeleted={() => {
            setSelectedDocument(null);
            loadContents();
            loadFolderTree();
          }}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}
