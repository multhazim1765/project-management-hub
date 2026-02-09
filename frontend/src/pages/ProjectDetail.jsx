import { useState, useEffect } from 'react';
import { useParams, Link, Outlet, useLocation } from 'react-router-dom';
import { projectAPI } from '../services/api';
import { PROJECT_STATUS_LABELS } from '../constants';
import { ClipboardDocumentListIcon, FlagIcon, ExclamationCircleIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const tabs = [
  { name: 'Overview', href: '', icon: null },
  { name: 'Tasks', href: '/tasks', icon: ClipboardDocumentListIcon },
  { name: 'Milestones', href: '/milestones', icon: FlagIcon },
  { name: 'Issues', href: '/issues', icon: ExclamationCircleIcon },
  { name: 'Discussions', href: '/discussions', icon: ChatBubbleLeftRightIcon },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const location = useLocation();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectAPI.getById(projectId)
      .then((res) => setProject(res.data.data.project))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return <div className="animate-pulse"><div className="h-32 skeleton" /></div>;
  }

  if (!project) {
    return <div className="text-center py-12"><h1 className="text-xl font-bold text-gray-900">Project not found</h1></div>;
  }

  const currentTab = tabs.find((tab) => location.pathname === `/projects/${projectId}${tab.href}`) || tabs[0];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: project.color || '#3B82F6' }}>
            {project.name.charAt(0)}
          </div>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <p className="text-gray-500">{project.key} &middot; {PROJECT_STATUS_LABELS[project.status]}</p>
          </div>
        </div>
        <Link to={`/projects/${projectId}/settings`} className="btn-secondary">
          <Cog6ToothIcon className="w-5 h-5 mr-2" />
          Settings
        </Link>
      </div>

      <nav className="border-b border-gray-200">
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              to={`/projects/${projectId}${tab.href}`}
              className={clsx(
                'flex items-center py-4 px-1 border-b-2 text-sm font-medium',
                currentTab.name === tab.name
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.icon && <tab.icon className="w-5 h-5 mr-2" />}
              {tab.name}
            </Link>
          ))}
        </div>
      </nav>

      {location.pathname === `/projects/${projectId}` ? (
        <div className="card card-body">
          <h2 className="text-lg font-semibold mb-4">Project Overview</h2>
          <p className="text-gray-600">{project.description || 'No description provided.'}</p>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Members</p>
              <p className="text-2xl font-bold">{project.members?.length || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="text-lg font-semibold">{project.startDate ? new Date(project.startDate).toLocaleDateString() : '-'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">End Date</p>
              <p className="text-lg font-semibold">{project.endDate ? new Date(project.endDate).toLocaleDateString() : '-'}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Priority</p>
              <p className="text-lg font-semibold capitalize">{project.priority}</p>
            </div>
          </div>
        </div>
      ) : (
        <Outlet context={{ project }} />
      )}
    </div>
  );
}
