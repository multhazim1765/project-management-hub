import { useState, useEffect } from 'react';
import { taskAPI } from '../../services/api';
import {
  PlusIcon,
  CheckCircleIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function SubtaskList({ parentTaskId, onSubtaskChange }) {
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimatedHours: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSubtasks();
  }, [parentTaskId]);

  const loadSubtasks = async () => {
    setLoading(true);
    try {
      const response = await taskAPI.getSubtasks(parentTaskId);
      setSubtasks(response.data.data.subtasks || []);
      if (onSubtaskChange) {
        onSubtaskChange(response.data.data.subtasks || []);
      }
    } catch (error) {
      console.error('Failed to load subtasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubtask = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await taskAPI.createSubtask(parentTaskId, {
        ...formData,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      });
      toast.success('Subtask created');
      setFormData({ title: '', description: '', priority: 'medium', estimatedHours: '' });
      setShowForm(false);
      loadSubtasks();
    } catch (error) {
      toast.error('Failed to create subtask');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (subtask) => {
    const newStatus = subtask.status === 'closed' ? 'open' : 'closed';

    try {
      await taskAPI.updateStatus(subtask._id, newStatus);
      loadSubtasks();
    } catch (error) {
      toast.error('Failed to update subtask');
      console.error(error);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!confirm('Delete this subtask?')) return;

    try {
      await taskAPI.delete(subtaskId);
      toast.success('Subtask deleted');
      loadSubtasks();
    } catch (error) {
      toast.error('Failed to delete subtask');
      console.error(error);
    }
  };

  const completedCount = subtasks.filter((st) => st.status === 'closed').length;
  const progressPercentage = subtasks.length > 0
    ? Math.round((completedCount / subtasks.length) * 100)
    : 0;

  if (loading) {
    return <div className="text-sm text-gray-500">Loading subtasks...</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-900">Subtasks</h3>
          <span className="text-sm text-gray-500">
            {completedCount} / {subtasks.length}
          </span>
          {subtasks.length > 0 && (
            <div className="flex-1 max-w-xs">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
        >
          {showForm ? (
            <>
              <XMarkIcon className="w-4 h-4" />
              <span>Cancel</span>
            </>
          ) : (
            <>
              <PlusIcon className="w-4 h-4" />
              <span>Add Subtask</span>
            </>
          )}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreateSubtask} className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div>
            <input
              type="text"
              required
              className="input text-sm"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Subtask title"
              autoFocus
            />
          </div>
          <div>
            <textarea
              className="input text-sm resize-none"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description (optional)"
            />
          </div>
          <div className="flex space-x-2">
            <select
              className="input text-sm flex-1"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <input
              type="number"
              step="0.5"
              min="0"
              className="input text-sm w-24"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
              placeholder="Hours"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary text-sm py-1.5 px-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary text-sm py-1.5 px-3"
            >
              {saving ? 'Adding...' : 'Add Subtask'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {subtasks.map((subtask) => (
          <div
            key={subtask._id}
            className={clsx(
              'flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors',
              subtask.status === 'closed' && 'opacity-60'
            )}
          >
            <div className="flex items-center space-x-3 flex-1">
              <button
                onClick={() => handleToggleStatus(subtask)}
                className="flex-shrink-0"
              >
                {subtask.status === 'closed' ? (
                  <CheckCircleSolid className="w-5 h-5 text-green-500" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={clsx(
                    'text-sm font-medium',
                    subtask.status === 'closed'
                      ? 'line-through text-gray-500'
                      : 'text-gray-900'
                  )}
                >
                  {subtask.title}
                </p>
                {subtask.description && (
                  <p className="text-xs text-gray-500 line-clamp-1">{subtask.description}</p>
                )}
              </div>

              <div className="flex items-center space-x-3 text-xs text-gray-500">
                {subtask.estimatedHours && (
                  <span>{subtask.estimatedHours}h</span>
                )}
                {subtask.priority && subtask.priority !== 'medium' && (
                  <span className={clsx(
                    'px-2 py-0.5 rounded capitalize',
                    subtask.priority === 'low' && 'bg-gray-200 text-gray-700',
                    subtask.priority === 'high' && 'bg-orange-200 text-orange-800',
                    subtask.priority === 'urgent' && 'bg-red-200 text-red-800'
                  )}>
                    {subtask.priority}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => handleDeleteSubtask(subtask._id)}
              className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ))}

        {subtasks.length === 0 && !showForm && (
          <div className="text-center py-6 text-gray-400 text-sm">
            No subtasks yet. Click "Add Subtask" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
