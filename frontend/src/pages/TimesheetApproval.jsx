import { useState, useEffect } from 'react';
import { timeEntryAPI } from '../services/api';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function TimesheetApproval() {
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    loadPendingEntries();
  }, []);

  const loadPendingEntries = async () => {
    setLoading(true);
    try {
      const response = await timeEntryAPI.getPendingApprovals();
      setPendingEntries(response.data.data.entries || []);
    } catch (error) {
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (selected.length === 0) {
      toast.error('Please select entries to approve');
      return;
    }

    try {
      await timeEntryAPI.approve({ entryIds: selected, approved: true });
      toast.success(`${selected.length} entries approved`);
      setSelected([]);
      loadPendingEntries();
    } catch (error) {
      toast.error('Failed to approve entries');
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selected.length === pendingEntries.length) {
      setSelected([]);
    } else {
      setSelected(pendingEntries.map((e) => e._id));
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">Timesheet Approvals</h1>
              {selected.length > 0 && (
                <div className="flex space-x-2">
                  <button onClick={handleApprove} className="btn-primary flex items-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span>Approve ({selected.length})</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {pendingEntries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ClockIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>No pending approvals</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3">
                      <input
                        type="checkbox"
                        checked={selected.length === pendingEntries.length}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Hours
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingEntries.map((entry) => (
                    <tr key={entry._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selected.includes(entry._id)}
                          onChange={() => toggleSelect(entry._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {entry.userId?.firstName} {entry.userId?.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.projectId?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(entry.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {entry.hours}h
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {entry.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
