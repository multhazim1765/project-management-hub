import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, taskAPI } from '../services/api';
import { ROLES, TASK_STATUS_LABELS, TASK_PRIORITY_LABELS, PRIORITY_COLORS } from '../constants';
import {
  FolderIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

function StatCard({ icon: Icon, label, value, color, change }) {
  return (
    <div className="card card-body">
      <div className="flex items-center">
        <div className={clsx('p-3 rounded-lg', color)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        {change && (
          <div className="ml-auto flex items-center text-green-600">
            <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
            <span className="text-sm font-medium">{change}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }) {
  return (
    <Link
      to={`/projects/${task.projectId?._id}/tasks/${task._id}`}
      className="block p-4 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
          <p className="text-xs text-gray-500 mt-1">
            {task.projectId?.name} &middot; {task.taskKey}
          </p>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              PRIORITY_COLORS[task.priority]
            )}
          />
          <span className="badge badge-gray text-xs">
            {TASK_STATUS_LABELS[task.status]}
          </span>
        </div>
      </div>
      {task.dueDate && (
        <p className="text-xs text-gray-500 mt-2">
          Due: {new Date(task.dueDate).toLocaleDateString()}
        </p>
      )}
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Add debugging
        console.log('User data:', user);
        console.log('User role:', user?.role);

        if (!user || !user.role) {
          setError('User data not loaded properly');
          setLoading(false);
          return;
        }

        let response;

        switch (user.role) {
          case ROLES.SUPER_ADMIN:
            response = await dashboardAPI.getAdmin();
            break;
          case ROLES.PROJECT_ADMIN:
            response = await dashboardAPI.getProjectAdmin();
            break;
          case ROLES.PROJECT_MANAGER:
            response = await dashboardAPI.getProjectManager();
            break;
          default:
            response = await dashboardAPI.getTeamMember();
        }

        setData(response.data.data);
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user.role]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card card-body">
              <div className="h-20 skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto" />
        <p className="mt-4 text-gray-600">{error}</p>
      </div>
    );
  }

  // Team member dashboard
  if (user.role === ROLES.TEAM_MEMBER || user.role === ROLES.CLIENT) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your tasks today.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={ClipboardDocumentListIcon}
            label="My Tasks"
            value={data?.myTasks?.length || 0}
            color="bg-primary-500"
          />
          <StatCard
            icon={ExclamationTriangleIcon}
            label="Overdue"
            value={data?.overdueTasks?.length || 0}
            color="bg-red-500"
          />
          <StatCard
            icon={ClockIcon}
            label="Hours This Week"
            value={data?.weeklyTime?.totalHours?.toFixed(1) || '0'}
            color="bg-green-500"
          />
          <StatCard
            icon={FolderIcon}
            label="Projects"
            value={data?.myProjects?.length || 0}
            color="bg-purple-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Tasks */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Today's Deadlines</h2>
              <Link to="/my-tasks" className="text-sm text-primary-600 hover:text-primary-700">
                View all
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {data?.todaysTasks?.length > 0 ? (
                data.todaysTasks.map((task) => (
                  <TaskCard key={task._id} task={task} />
                ))
              ) : (
                <p className="p-4 text-gray-500 text-center">No tasks due today</p>
              )}
            </div>
          </div>

          {/* Overdue Tasks */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Overdue Tasks</h2>
              <span className="badge badge-danger">{data?.overdueTasks?.length || 0}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {data?.overdueTasks?.length > 0 ? (
                data.overdueTasks.slice(0, 5).map((task) => (
                  <TaskCard key={task._id} task={task} />
                ))
              ) : (
                <p className="p-4 text-gray-500 text-center">No overdue tasks</p>
              )}
            </div>
          </div>
        </div>

        {/* My Projects */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">My Projects</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {data?.myProjects?.map((project) => (
              <Link
                key={project._id}
                to={`/projects/${project._id}`}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-sm transition-all"
              >
                <div className="flex items-center">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: project.color || '#3B82F6' }}
                  >
                    {project.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                    <p className="text-xs text-gray-500">{project.key}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Project Manager / Admin dashboard
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your projects and team performance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={FolderIcon}
          label="Total Projects"
          value={data?.projects?.length || data?.stats?.totalProjects || 0}
          color="bg-primary-500"
        />
        <StatCard
          icon={ClipboardDocumentListIcon}
          label="Open Tasks"
          value={data?.taskStats?.open || 0}
          color="bg-yellow-500"
        />
        <StatCard
          icon={ExclamationTriangleIcon}
          label="Overdue Tasks"
          value={data?.overdueTasks?.length || 0}
          color="bg-red-500"
        />
        <StatCard
          icon={ChartBarIcon}
          label="Open Issues"
          value={data?.openIssues || 0}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Health */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Project Health</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data?.projects?.slice(0, 5).map((project) => (
              <Link
                key={project._id}
                to={`/projects/${project._id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: project.color || '#3B82F6' }}
                  >
                    {project.name?.charAt(0)}
                  </div>
                  <span className="ml-3 font-medium text-gray-900">{project.name}</span>
                </div>
                <span
                  className={clsx(
                    'badge',
                    project.health === 'on-track' && 'badge-success',
                    project.health === 'at-risk' && 'badge-warning',
                    project.health === 'delayed' && 'badge-danger'
                  )}
                >
                  {project.health?.replace('-', ' ')}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Overdue Tasks</h2>
            <span className="badge badge-danger">{data?.overdueTasks?.length || 0}</span>
          </div>
          <div className="divide-y divide-gray-100">
            {data?.overdueTasks?.length > 0 ? (
              data.overdueTasks.slice(0, 5).map((task) => (
                <TaskCard key={task._id} task={task} />
              ))
            ) : (
              <p className="p-4 text-gray-500 text-center">No overdue tasks</p>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Milestones */}
      {data?.upcomingMilestones?.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Milestones</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {data.upcomingMilestones.map((milestone) => (
              <div key={milestone._id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{milestone.name}</p>
                    <p className="text-sm text-gray-500">{milestone.projectId?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">
                      {new Date(milestone.dueDate).toLocaleDateString()}
                    </p>
                    <div className="flex items-center mt-1">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500"
                          style={{ width: `${milestone._progress || 0}%` }}
                        />
                      </div>
                      <span className="ml-2 text-xs text-gray-500">
                        {milestone._progress || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
