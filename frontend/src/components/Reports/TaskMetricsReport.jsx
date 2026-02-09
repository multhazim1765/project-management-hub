import { useState, useEffect } from 'react';
import { reportAPI } from '../../services/api';

export default function TaskMetricsReport({ projectId, dateRange }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [projectId, dateRange]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.getTaskMetrics(projectId, dateRange);
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

  const { summary, byPriority, byStatus } = report;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{summary.totalTasks}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{summary.completedTasks}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-2xl font-bold text-red-600">{summary.overdueTasks}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Avg Completion</p>
          <p className="text-2xl font-bold text-primary-600">
            {summary.avgCompletionTimeDays.toFixed(1)}d
          </p>
        </div>
      </div>

      {/* By Priority */}
      {byPriority && byPriority.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Priority</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Avg Est. Hours
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byPriority.map((stat) => (
                  <tr key={stat._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                      {stat._id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {stat.completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(stat.avgEstimatedHours || 0).toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By Status */}
      {byStatus && byStatus.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tasks by Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {byStatus.map((stat) => (
              <div key={stat._id} className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 capitalize">{stat._id}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.count}</p>
                <div className="mt-2 text-xs text-gray-500">
                  <p>Est: {(stat.totalEstimatedHours || 0).toFixed(1)}h</p>
                  <p>Actual: {(stat.totalActualHours || 0).toFixed(1)}h</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
