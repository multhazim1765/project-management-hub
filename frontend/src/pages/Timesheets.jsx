import { useState, useEffect } from 'react';
import { timeEntryAPI } from '../services/api';
import { ClockIcon, PlayIcon, StopIcon, PlusIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function Timesheets() {
  const [timeEntries, setTimeEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState(null);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    };
  });

  useEffect(() => {
    fetchTimeEntries();
    checkActiveTimer();
  }, [dateRange]);

  const fetchTimeEntries = async () => {
    try {
      const response = await timeEntryAPI.getMyEntries({
        startDate: dateRange.start,
        endDate: dateRange.end,
        limit: 100
      });
      const entries = response.data.data.timeEntries;
      setTimeEntries(entries);
      const total = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
      setWeeklyTotal(total);
    } catch (error) {
      toast.error('Failed to load time entries');
    } finally {
      setLoading(false);
    }
  };

  const checkActiveTimer = async () => {
    try {
      const response = await timeEntryAPI.getActiveTimer();
      setActiveTimer(response.data.data.timer);
    } catch (error) {
      // No active timer
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const groupByDate = (entries) => {
    return entries.reduce((groups, entry) => {
      const date = new Date(entry.date).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(entry);
      return groups;
    }, {});
  };

  const groupedEntries = groupByDate(timeEntries);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Timesheets</h1>
        <button className="btn-primary"><PlusIcon className="w-5 h-5 mr-2" />Log Time</button>
      </div>

      {activeTimer && (
        <div className="card card-body bg-primary-50 border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center animate-pulse">
                <ClockIcon className="w-5 h-5" />
              </div>
              <div className="ml-4">
                <p className="font-semibold">Timer Running</p>
                <p className="text-sm text-gray-600">{activeTimer.taskId?.title || 'No task'}</p>
              </div>
            </div>
            <button className="btn-danger">
              <StopIcon className="w-5 h-5 mr-2" />Stop Timer
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-body">
          <p className="text-sm text-gray-500">This Week</p>
          <p className="text-2xl font-bold">{formatDuration(weeklyTotal)}</p>
        </div>
        <div className="card card-body">
          <p className="text-sm text-gray-500">Today</p>
          <p className="text-2xl font-bold">
            {formatDuration(
              timeEntries
                .filter((e) => new Date(e.date).toDateString() === new Date().toDateString())
                .reduce((sum, e) => sum + (e.duration || 0), 0)
            )}
          </p>
        </div>
        <div className="card card-body">
          <p className="text-sm text-gray-500">Entries</p>
          <p className="text-2xl font-bold">{timeEntries.length}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <input
          type="date"
          className="input w-auto"
          value={dateRange.start}
          onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
        />
        <span className="self-center text-gray-500">to</span>
        <input
          type="date"
          className="input w-auto"
          value={dateRange.end}
          onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
        />
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton" />)}</div>
      ) : Object.keys(groupedEntries).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedEntries).map(([date, entries]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-700">{date}</h3>
                <span className="text-sm text-gray-500">
                  {formatDuration(entries.reduce((sum, e) => sum + (e.duration || 0), 0))}
                </span>
              </div>
              <div className="card overflow-hidden">
                <div className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <div key={entry._id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{entry.taskId?.title || entry.description || 'No description'}</p>
                        <p className="text-sm text-gray-500">{entry.projectId?.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatDuration(entry.duration)}</p>
                        {entry.startTime && entry.endTime && (
                          <p className="text-sm text-gray-500">
                            {new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                            {new Date(entry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 card">
          <ClockIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No time entries for this period</p>
        </div>
      )}
    </div>
  );
}
