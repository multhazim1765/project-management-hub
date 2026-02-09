import { useState, useEffect } from 'react';
import { taskAPI } from '../../services/api';
import { PlusIcon, UserIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

const TASK_STATUS_COLUMNS = {
  open: { name: 'To Do', color: 'bg-gray-100' },
  'in-progress': { name: 'In Progress', color: 'bg-blue-100' },
  'in-review': { name: 'In Review', color: 'bg-purple-100' },
  closed: { name: 'Done', color: 'bg-green-100' },
};

function TaskCard({ task, onTaskClick }) {
  const priorityColors = {
    low: 'bg-gray-200 text-gray-700',
    medium: 'bg-yellow-200 text-yellow-800',
    high: 'bg-orange-200 text-orange-800',
    urgent: 'bg-red-200 text-red-800',
  };

  return (
    <div
      className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer mb-3"
      onClick={() => onTaskClick(task)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task._id);
        e.dataTransfer.setData('currentStatus', task.status);
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 line-clamp-2">{task.title}</h4>
        {task.priority && (
          <span
            className={clsx(
              'px-2 py-0.5 rounded text-xs font-medium ml-2 flex-shrink-0',
              priorityColors[task.priority]
            )}
          >
            {task.priority}
          </span>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          {task.assigneeIds && task.assigneeIds.length > 0 && (
            <div className="flex -space-x-2">
              {task.assigneeIds.slice(0, 3).map((assignee) => (
                <div
                  key={assignee._id}
                  className="w-6 h-6 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center"
                  title={`${assignee.firstName} ${assignee.lastName}`}
                >
                  {assignee.avatar ? (
                    <img
                      src={assignee.avatar}
                      alt=""
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-primary-700">
                      {assignee.firstName?.[0]}
                      {assignee.lastName?.[0]}
                    </span>
                  )}
                </div>
              ))}
              {task.assigneeIds.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs text-gray-600">
                  +{task.assigneeIds.length - 3}
                </div>
              )}
            </div>
          )}
        </div>

        {task.dueDate && (
          <span
            className={clsx(
              'text-xs',
              new Date(task.dueDate) < new Date() && task.status !== 'closed'
                ? 'text-red-600 font-medium'
                : 'text-gray-500'
            )}
          >
            {new Date(task.dueDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ status, column, tasks, onDrop, onTaskClick, onAddTask }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const taskId = e.dataTransfer.getData('taskId');
    const currentStatus = e.dataTransfer.getData('currentStatus');

    if (currentStatus !== status) {
      onDrop(taskId, status);
    }
  };

  return (
    <div className="flex-1 min-w-[280px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={clsx('w-3 h-3 rounded-full', column.color)} />
          <h3 className="font-semibold text-gray-900">{column.name}</h3>
          <span className="text-sm text-gray-500">({tasks.length})</span>
        </div>
        <button
          onClick={() => onAddTask(status)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <PlusIcon className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div
        className={clsx(
          'min-h-[500px] rounded-lg p-3 transition-colors',
          isDragOver ? 'bg-primary-50 border-2 border-primary-300' : 'bg-gray-50 border-2 border-transparent'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.map((task) => (
          <TaskCard key={task._id} task={task} onTaskClick={onTaskClick} />
        ))}

        {tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Drop tasks here or click + to add
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({ projectId, onTaskClick, onRefresh }) {
  const [tasksByStatus, setTasksByStatus] = useState({
    open: [],
    'in-progress': [],
    'in-review': [],
    closed: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const response = await taskAPI.getByProject(projectId, { parentTaskId: 'none' });
      const tasks = response.data.data.tasks || [];

      // Group tasks by status
      const grouped = {
        open: [],
        'in-progress': [],
        'in-review': [],
        closed: [],
      };

      tasks.forEach((task) => {
        if (grouped[task.status]) {
          grouped[task.status].push(task);
        }
      });

      setTasksByStatus(grouped);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (taskId, newStatus) => {
    try {
      await taskAPI.updateStatus(taskId, newStatus);
      toast.success('Task status updated');
      loadTasks();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error('Failed to update task status');
      console.error(error);
    }
  };

  const handleAddTask = (status) => {
    // This would open a modal to create a new task with this status
    toast.info(`Create new task in ${TASK_STATUS_COLUMNS[status].name}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex space-x-4 overflow-x-auto pb-4">
      {Object.entries(TASK_STATUS_COLUMNS).map(([status, column]) => (
        <KanbanColumn
          key={status}
          status={status}
          column={column}
          tasks={tasksByStatus[status]}
          onDrop={handleDrop}
          onTaskClick={onTaskClick}
          onAddTask={handleAddTask}
        />
      ))}
    </div>
  );
}
