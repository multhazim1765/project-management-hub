import { useState, useEffect } from 'react';
import { reportAPI } from '../../services/api';
import { ChartBarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function ProjectProgressReport({ projectId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [projectId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.getProjectProgress(projectId);
      setReport(response.data.data.report);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading report...</div>;
  }

  if (!report) {
    return <div className="text-center py-8 text-gray-500">Failed to load report</div>;
  }

  const { project, summary, tasksByStatus, timeTracking, topContributors } = report;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100">Progress</p>
              <p className="text-3xl font-bold">{summary.progressPercentage}%</p>
            </div>
            <ChartBarIcon className="w-12 h-12 text-primary-200" />
          </div>
          <p className="text-sm text-primary-100 mt-2">
            {summary.completedTasks} of {summary.totalTasks} tasks completed
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Total Hours</p>
              <p className="text-3xl font-bold">{summary.totalActualHours.toFixed(1)}</p>
            </div>
            <ClockIcon className="w-12 h-12 text-green-200" />
          </div>
          <p className="text-sm text-green-100 mt-2">
            Est: {summary.totalEstimatedHours.toFixed(1)}h
          </p>
        </div>

        <div className={`bg-gradient-to-br ${
          summary.scheduleStatus === 'on-track' ? 'from-blue-500 to-blue-600' :
          summary.scheduleStatus === 'ahead' ? 'from-green-500 to-green-600' :
          'from-orange-500 to-orange-600'
        } rounded-lg p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80">Schedule</p>
              <p className="text-2xl font-bold capitalize">{summary.scheduleStatus}</p>
            </div>
            <CheckCircleIcon className="w-12 h-12 text-white/60" />
          </div>
        </div>
      </div>

      {/* Tasks by Status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Status</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estimated Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actual Hours
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tasksByStatus.map((stat) => (
                <tr key={stat.status}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                    {stat.status}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.estimatedHours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {stat.actualHours.toFixed(1)}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Contributors */}
      {topContributors && topContributors.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Contributors</h3>
          <div className="space-y-3">
            {topContributors.slice(0, 5).map((contributor, index) => (
              <div key={contributor.user._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-700 rounded-full font-semibold text-sm">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {contributor.user.firstName} {contributor.user.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{contributor.user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{contributor.totalHours.toFixed(1)}h</p>
                  <p className="text-sm text-gray-500">
                    {contributor.billableHours.toFixed(1)}h billable
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
