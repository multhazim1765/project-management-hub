import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { taskAPI, projectAPI } from '../services/api';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, PRIORITY_COLORS, STATUS_COLORS } from '../constants';
import { PlusIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

function CreateTaskModal({ isOpen, onClose, projectId, onCreated }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assigneeIds: [],
    dueDate: '',
    estimatedHours: '',
  });
  const [loading, setLoading] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);

  useEffect(() => {
    if (isOpen && projectId) {
      loadProjectMembers();
    }
  }, [isOpen, projectId]);

  const loadProjectMembers = async () => {
    try {
      const response = await projectAPI.getMembers(projectId);
      setProjectMembers(response.data.data.members || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
      };
      const response = await taskAPI.create(projectId, submitData);
      toast.success('Task created successfully');
      onCreated(response.data.data.task);
      onClose();
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        assigneeIds: [],
        dueDate: '',
        estimatedHours: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignee = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(userId)
        ? prev.assigneeIds.filter((id) => id !== userId)
        : [...prev.assigneeIds, userId],
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Task Title</label>
            <input
              type="text"
              required
              className="input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the task"
            />
          </div>

          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="label">Assign To (Optional)</label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
              {projectMembers.length === 0 ? (
                <p className="text-sm text-gray-500">Loading members...</p>
              ) : (
                <div className="space-y-2">
                  {projectMembers.map((member) => (
                    <label
                      key={member.userId._id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assigneeIds.includes(member.userId._id)}
                        onChange={() => toggleAssignee(member.userId._id)}
                        className="rounded text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex items-center space-x-2">
                        {member.userId.avatar ? (
                          <img
                            src={member.userId.avatar}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs text-primary-700">
                            {member.userId.firstName?.[0]}{member.userId.lastName?.[0]}
                          </div>
                        )}
                        <span className="text-sm text-gray-700">
                          {member.userId.firstName} {member.userId.lastName}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Due Date (Optional)</label>
              <input
                type="date"
                className="input"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="input"
                value={formData.estimatedHours}
                onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { projectId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [projectId, filter]);

  const fetchTasks = async () => {
    try {
      const response = await taskAPI.getByProject(projectId, { ...filter, limit: 50 });
      setTasks(response.data.data.tasks);
    } catch (error) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreated = (newTask) => {
    setTasks([newTask, ...tasks]);
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary"><PlusIcon className="w-5 h-5 mr-2" />New Task</button>
      </div>

      <CreateTaskModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
        projectId={projectId}
        onCreated={handleTaskCreated}
      />

      <div className="flex gap-4">
        <select className="input w-auto" value={filter.status} onChange={(e) => setFilter({...filter, status: e.target.value})}>
          <option value="">All Status</option>
          {Object.entries(TASK_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input w-auto" value={filter.priority} onChange={(e) => setFilter({...filter, priority: e.target.value})}>
          <option value="">All Priority</option>
          {Object.entries(TASK_PRIORITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton" />)}</div>
      ) : tasks.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="table w-full">
            <thead className="bg-gray-50">
              <tr>
                <th>Task</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignees</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <tr key={task._id}>
                  <td>
                    <Link to={`/projects/${projectId}/tasks/${task._id}`} className="text-primary-600 hover:text-primary-700 font-medium">
                      {task.title}
                    </Link>
                    <p className="text-xs text-gray-500">{task.taskKey}</p>
                  </td>
                  <td><span className={clsx('badge', task.status === 'completed' ? 'badge-success' : 'badge-gray')}>{TASK_STATUS_LABELS[task.status]}</span></td>
                  <td><span className={clsx('w-2 h-2 rounded-full inline-block mr-2', PRIORITY_COLORS[task.priority])} />{TASK_PRIORITY_LABELS[task.priority]}</td>
                  <td><div className="flex -space-x-2">{task.assigneeIds?.slice(0, 3).map((a) => <div key={a._id} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white text-xs flex items-center justify-center">{a.firstName?.[0]}</div>)}</div></td>
                  <td>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 card"><p className="text-gray-500">No tasks found</p></div>
      )}
    </div>
  );
}
