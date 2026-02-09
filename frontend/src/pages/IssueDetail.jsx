import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { issueAPI } from '../services/api';
import { ISSUE_STATUS_LABELS, ISSUE_SEVERITY_LABELS } from '../constants';
import { BugAntIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function IssueDetail() {
  const { projectId, issueId } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    issueAPI.getById(issueId)
      .then((res) => setIssue(res.data.data.issue))
      .catch(() => toast.error('Failed to load issue'))
      .finally(() => setLoading(false));
  }, [issueId]);

  if (loading) return <div className="animate-pulse"><div className="h-64 skeleton" /></div>;
  if (!issue) return <div className="text-center py-12"><h1 className="text-xl font-bold">Issue not found</h1></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to={`/projects/${projectId}/issues`} className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to issues</Link>
          <div className="flex items-center mt-2">
            <BugAntIcon className="w-6 h-6 text-red-500 mr-2" />
            <h1 className="text-2xl font-bold text-gray-900">{issue.title}</h1>
          </div>
          <p className="text-gray-500">{issue.issueKey} &middot; {issue.project?.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card card-body">
            <h2 className="font-semibold mb-2">Description</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{issue.description || 'No description provided.'}</p>
          </div>

          {issue.stepsToReproduce && (
            <div className="card card-body">
              <h2 className="font-semibold mb-2">Steps to Reproduce</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{issue.stepsToReproduce}</p>
            </div>
          )}

          {issue.expectedBehavior && (
            <div className="card card-body">
              <h2 className="font-semibold mb-2">Expected Behavior</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{issue.expectedBehavior}</p>
            </div>
          )}

          {issue.actualBehavior && (
            <div className="card card-body">
              <h2 className="font-semibold mb-2">Actual Behavior</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{issue.actualBehavior}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card card-body space-y-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={clsx('badge mt-1',
                issue.status === 'resolved' || issue.status === 'closed' ? 'badge-success' :
                issue.status === 'in_progress' ? 'badge-primary' : 'badge-gray'
              )}>
                {ISSUE_STATUS_LABELS[issue.status]}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Severity</p>
              <p className="font-medium capitalize">{ISSUE_SEVERITY_LABELS[issue.severity]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Reporter</p>
              <p className="font-medium">{issue.reporterId?.firstName} {issue.reporterId?.lastName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Assignee</p>
              <p className="font-medium">{issue.assigneeId ? `${issue.assigneeId.firstName} ${issue.assigneeId.lastName}` : 'Unassigned'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{new Date(issue.createdAt).toLocaleString()}</p>
            </div>
            {issue.resolvedAt && (
              <div>
                <p className="text-sm text-gray-500">Resolved</p>
                <p className="font-medium">{new Date(issue.resolvedAt).toLocaleString()}</p>
              </div>
            )}
            {issue.environment && (
              <div>
                <p className="text-sm text-gray-500">Environment</p>
                <p className="font-medium">{issue.environment}</p>
              </div>
            )}
            {issue.relatedTaskId && (
              <div>
                <p className="text-sm text-gray-500">Related Task</p>
                <Link to={`/projects/${projectId}/tasks/${issue.relatedTaskId._id}`} className="text-primary-600 hover:text-primary-700">
                  {issue.relatedTaskId.taskKey}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
