import { useState, useEffect } from 'react';
import { reportAPI } from '../../services/api';

export default function TimeUtilizationReport({ filters }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [filters]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.getTimeUtilization(filters);
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

  const { summary, byProject, byUser } = report;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Hours</p>
          <p className="text-2xl font-bold text-gray-900">{summary.totalHours.toFixed(1)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Billable Hours</p>
          <p className="text-2xl font-bold text-green-600">{summary.billableHours.toFixed(1)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-primary-600">${summary.totalAmount.toFixed(2)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">Time Entries</p>
          <p className="text-2xl font-bold text-gray-900">{summary.entryCount}</p>
        </div>
      </div>

      {/* By Project */}
      {byProject && byProject.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours by Project</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Billable Hours
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {byProject.slice(0, 10).map((proj) => (
                  <tr key={proj.project._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {proj.project.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {proj.totalHours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {proj.billableHours.toFixed(1)}h
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* By User */}
      {byUser && byUser.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hours by User</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {byUser.slice(0, 6).map((user) => (
              <div key={user.user._id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.user.firstName} {user.user.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{user.user.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{user.totalHours.toFixed(1)}h</p>
                    <p className="text-sm text-gray-500">{user.billableHours.toFixed(1)}h billable</p>
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
