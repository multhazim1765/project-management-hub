import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { taskAPI } from '../services/api';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '../constants';
import toast from 'react-hot-toast';

export default function TaskDetail() {
  const { projectId, taskId } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    taskAPI.getById(taskId)
      .then((res) => setTask(res.data.data.task))
      .catch(() => toast.error('Failed to load task'))
      .finally(() => setLoading(false));
  }, [taskId]);

  if (loading) return <div className="animate-pulse"><div className="h-64 skeleton" /></div>;
  if (!task) return <div className="text-center py-12"><h1 className="text-xl font-bold">Task not found</h1></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/projects/${projectId}/tasks`} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to tasks</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{task.title}</h1>
          <p className="text-gray-500">{task.taskKey} &middot; {task.project?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card card-body">
            <h2 className="font-semibold mb-2">Description</h2>
            <p className="text-gray-600">{task.description || 'No description provided.'}</p>
          </div>

          {task.subtasks?.length > 0 && (
            <div className="card card-body">
              <h2 className="font-semibold mb-2">Subtasks</h2>
              <div className="space-y-2">
                {task.subtasks.map((st) => (
                  <div key={st._id} className="flex items-center p-2 bg-gray-50 rounded">
                    <span className={`w-2 h-2 rounded-full mr-3 ${st.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={st.status === 'completed' ? 'line-through text-gray-400' : ''}>{st.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card card-body space-y-4">
            <div><p className="text-sm text-gray-500">Status</p><p className="font-medium">{TASK_STATUS_LABELS[task.status]}</p></div>
            <div><p className="text-sm text-gray-500">Priority</p><p className="font-medium capitalize">{TASK_PRIORITY_LABELS[task.priority]}</p></div>
            <div><p className="text-sm text-gray-500">Due Date</p><p className="font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</p></div>
            <div><p className="text-sm text-gray-500">Assignees</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {task.assigneeIds?.map((a) => (
                  <span key={a._id} className="badge badge-gray">{a.firstName} {a.lastName}</span>
                ))}
              </div>
            </div>
            <div><p className="text-sm text-gray-500">Progress</p>
              <div className="w-full h-2 bg-gray-200 rounded-full mt-1">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${task.progress || 0}%` }} />
              </div>
              <p className="text-sm text-gray-500 mt-1">{task.progress || 0}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
