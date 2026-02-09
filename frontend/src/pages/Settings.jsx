import { useState, useEffect } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { PROJECT_STATUS_LABELS, PRIORITY_LABELS } from '../constants';
import toast from 'react-hot-toast';

export default function Settings() {
  const { projectId } = useParams();
  const context = useOutletContext();
  const [project, setProject] = useState(context?.project || null);
  const [loading, setLoading] = useState(!context?.project);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    key: '',
    description: '',
    status: '',
    priority: '',
    startDate: '',
    endDate: '',
    color: '#3B82F6'
  });

  useEffect(() => {
    if (!context?.project) {
      projectAPI.getById(projectId)
        .then((res) => {
          setProject(res.data.data.project);
        })
        .finally(() => setLoading(false));
    }
  }, [projectId, context]);

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name || '',
        key: project.key || '',
        description: project.description || '',
        status: project.status || 'planning',
        priority: project.priority || 'medium',
        startDate: project.startDate ? project.startDate.split('T')[0] : '',
        endDate: project.endDate ? project.endDate.split('T')[0] : '',
        color: project.color || '#3B82F6'
      });
    }
  }, [project]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await projectAPI.update(projectId, formData);
      toast.success('Project settings updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse"><div className="h-96 skeleton" /></div>;
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-6">Project Settings</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card card-body space-y-4">
          <h3 className="font-medium text-gray-900">General Information</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              className="input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Key</label>
            <input
              type="text"
              className="input"
              value={formData.key}
              onChange={(e) => setFormData({...formData, key: e.target.value.toUpperCase()})}
              maxLength={10}
              required
            />
            <p className="text-sm text-gray-500 mt-1">Used in task IDs (e.g., {formData.key}-123)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="input"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="w-10 h-10 rounded cursor-pointer border-0"
                value={formData.color}
                onChange={(e) => setFormData({...formData, color: e.target.value})}
              />
              <span className="text-sm text-gray-500">{formData.color}</span>
            </div>
          </div>
        </div>

        <div className="card card-body space-y-4">
          <h3 className="font-medium text-gray-900">Status & Priority</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="input"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                {Object.entries(PROJECT_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="input"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              >
                {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="card card-body space-y-4">
          <h3 className="font-medium text-gray-900">Timeline</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="input"
                value={formData.startDate}
                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="input"
                value={formData.endDate}
                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="card card-body bg-red-50 border-red-200">
          <h3 className="font-medium text-red-900">Danger Zone</h3>
          <p className="text-sm text-red-700 mt-1">Once you delete a project, there is no going back.</p>
          <button type="button" className="btn-danger mt-4">Delete Project</button>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
