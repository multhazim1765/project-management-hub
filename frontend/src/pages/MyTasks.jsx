import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { taskAPI } from '../services/api';
import { TASK_STATUS_LABELS, PRIORITY_COLORS } from '../constants';
import clsx from 'clsx';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    taskAPI.getMyTasks({ limit: 50 })
      .then((res) => setTasks(res.data.data.tasks))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Tasks</h1>
      {loading ? (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton" />)}</div>
      ) : tasks.length > 0 ? (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Link key={task._id} to={`/projects/${task.projectId?._id}/tasks/${task._id}`} className="card p-4 block hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{task.title}</h3>
                  <p className="text-sm text-gray-500">{task.projectId?.name} &middot; {task.taskKey}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={clsx('w-2 h-2 rounded-full', PRIORITY_COLORS[task.priority])} />
                  <span className="badge badge-gray">{TASK_STATUS_LABELS[task.status]}</span>
                </div>
              </div>
              {task.dueDate && <p className="text-sm text-gray-500 mt-2">Due: {new Date(task.dueDate).toLocaleDateString()}</p>}
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 card"><p className="text-gray-500">No tasks assigned to you</p></div>
      )}
    </div>
  );
}
