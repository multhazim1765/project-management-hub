import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { PROJECT_STATUS, PROJECT_STATUS_LABELS } from '../constants';
import {
  PlusIcon,
  FolderIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project._id}`}
      className="card p-6 hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
            style={{ backgroundColor: project.color || '#3B82F6' }}
          >
            {project.name.charAt(0)}
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
              {project.name}
            </h3>
            <p className="text-sm text-gray-500">{project.key}</p>
          </div>
        </div>
        <span
          className={clsx(
            'badge',
            project.status === PROJECT_STATUS.ACTIVE && 'badge-success',
            project.status === PROJECT_STATUS.ON_HOLD && 'badge-warning',
            project.status === PROJECT_STATUS.COMPLETED && 'badge-primary',
            project.status === PROJECT_STATUS.ARCHIVED && 'badge-gray'
          )}
        >
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
      </div>

      {project.description && (
        <p className="mt-4 text-sm text-gray-600 line-clamp-2">
          {project.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {project.members?.slice(0, 3).map((member) => (
              <div
                key={member.userId?._id}
                className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                title={`${member.userId?.firstName} ${member.userId?.lastName}`}
              >
                {member.userId?.avatar ? (
                  <img
                    src={member.userId.avatar}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  member.userId?.firstName?.charAt(0)
                )}
              </div>
            ))}
            {project.members?.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500">
                +{project.members.length - 3}
              </div>
            )}
          </div>
          <span className="ml-2">{project.members?.length || 0} members</span>
        </div>
        <span>
          Updated {new Date(project.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    key: '',
    color: '#3B82F6',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await projectAPI.create(formData);
      toast.success('Project created successfully');
      onCreated(response.data.data.project);
      onClose();
      setFormData({ name: '', description: '', key: '', color: '#3B82F6' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Create New Project</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="label">Project Name</label>
            <input
              type="text"
              required
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label className="label">Project Key (optional)</label>
            <input
              type="text"
              className="input uppercase"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase() })}
              placeholder="e.g., PROJ"
              maxLength={10}
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the project"
            />
          </div>

          <div>
            <label className="label">Color</label>
            <input
              type="color"
              className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [status]);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll({ status: status || undefined });
      setProjects(response.data.data.projects);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (project) => {
    setProjects((prev) => [project, ...prev]);
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.key?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">
            Manage and organize your projects
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            className="input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <select
            className="input pl-10 pr-10 appearance-none"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All Status</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="h-40 skeleton" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project._id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 card">
          <FolderIcon className="w-12 h-12 text-gray-400 mx-auto" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No projects found</h3>
          <p className="mt-2 text-gray-500">
            {search
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first project'}
          </p>
          {!search && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary mt-4"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create Project
            </button>
          )}
        </div>
      )}

      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
