import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { issueAPI } from '../services/api';
import { ISSUE_STATUS_LABELS, ISSUE_SEVERITY_LABELS, SEVERITY_COLORS } from '../constants';
import { PlusIcon, BugAntIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function Issues() {
  const { projectId } = useParams();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', severity: '' });

  useEffect(() => {
    fetchIssues();
  }, [projectId, filter]);

  const fetchIssues = async () => {
    try {
      const response = await issueAPI.getByProject(projectId, { ...filter, limit: 50 });
      setIssues(response.data.data.issues);
    } catch (error) {
      toast.error('Failed to load issues');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Issues & Bugs</h2>
        <button className="btn-primary"><PlusIcon className="w-5 h-5 mr-2" />Report Issue</button>
      </div>

      <div className="flex gap-4">
        <select className="input w-auto" value={filter.status} onChange={(e) => setFilter({...filter, status: e.target.value})}>
          <option value="">All Status</option>
          {Object.entries(ISSUE_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select className="input w-auto" value={filter.severity} onChange={(e) => setFilter({...filter, severity: e.target.value})}>
          <option value="">All Severity</option>
          {Object.entries(ISSUE_SEVERITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton" />)}</div>
      ) : issues.length > 0 ? (
        <div className="card overflow-hidden">
          <table className="table w-full">
            <thead className="bg-gray-50">
              <tr>
                <th>Issue</th>
                <th>Status</th>
                <th>Severity</th>
                <th>Reporter</th>
                <th>Assignee</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {issues.map((issue) => (
                <tr key={issue._id}>
                  <td>
                    <Link to={`/projects/${projectId}/issues/${issue._id}`} className="text-primary-600 hover:text-primary-700 font-medium flex items-center">
                      <BugAntIcon className="w-4 h-4 mr-2 text-red-500" />
                      {issue.title}
                    </Link>
                    <p className="text-xs text-gray-500">{issue.issueKey}</p>
                  </td>
                  <td>
                    <span className={clsx('badge',
                      issue.status === 'resolved' || issue.status === 'closed' ? 'badge-success' :
                      issue.status === 'in_progress' ? 'badge-primary' : 'badge-gray'
                    )}>
                      {ISSUE_STATUS_LABELS[issue.status]}
                    </span>
                  </td>
                  <td>
                    <span className={clsx('w-2 h-2 rounded-full inline-block mr-2', SEVERITY_COLORS[issue.severity])} />
                    {ISSUE_SEVERITY_LABELS[issue.severity]}
                  </td>
                  <td>{issue.reporterId?.firstName} {issue.reporterId?.lastName}</td>
                  <td>{issue.assigneeId ? `${issue.assigneeId.firstName} ${issue.assigneeId.lastName}` : '-'}</td>
                  <td>{new Date(issue.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 card">
          <BugAntIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No issues reported</p>
        </div>
      )}
    </div>
  );
}
