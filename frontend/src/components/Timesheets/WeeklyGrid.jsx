import { useState, useEffect } from 'react';
import { timeEntryAPI, projectAPI, taskAPI } from '../../services/api';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function WeeklyGrid() {
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [entries, setEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [weekStart]);

  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const loadData = async () => {
    setLoading(true);
    try {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const [entriesRes, projectsRes] = await Promise.all([
        timeEntryAPI.getWeekly({
          startDate: weekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0],
        }),
        projectAPI.getAll(),
      ]);

      setEntries(entriesRes.data.data.entries || []);
      setProjects(projectsRes.data.data.projects || []);
    } catch (error) {
      toast.error('Failed to load timesheet');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    return day;
  });

  const getHoursForDay = (projectId, day) => {
    const dateStr = day.toISOString().split('T')[0];
    const entry = entries.find(
      (e) => e.projectId?._id === projectId && e.date.split('T')[0] === dateStr
    );
    return entry?.hours || 0;
  };

  const getDailyTotal = (day) => {
    const dateStr = day.toISOString().split('T')[0];
    return entries
      .filter((e) => e.date.split('T')[0] === dateStr)
      .reduce((sum, e) => sum + e.hours, 0);
  };

  const getProjectTotal = (projectId) => {
    return entries
      .filter((e) => e.projectId?._id === projectId)
      .reduce((sum, e) => sum + e.hours, 0);
  };

  const getWeekTotal = () => {
    return entries.reduce((sum, e) => sum + e.hours, 0);
  };

  const handleCellClick = async (projectId, day) => {
    const dateStr = day.toISOString().split('T')[0];
    const currentHours = getHoursForDay(projectId, day);
    const hours = prompt(`Enter hours for ${dateStr}:`, currentHours || '0');

    if (hours === null) return;

    const parsedHours = parseFloat(hours);
    if (isNaN(parsedHours) || parsedHours < 0) {
      toast.error('Invalid hours');
      return;
    }

    try {
      const existingEntry = entries.find(
        (e) => e.projectId?._id === projectId && e.date.split('T')[0] === dateStr
      );

      if (existingEntry) {
        if (parsedHours === 0) {
          await timeEntryAPI.delete(existingEntry._id);
        } else {
          await timeEntryAPI.update(existingEntry._id, { hours: parsedHours });
        }
      } else if (parsedHours > 0) {
        await timeEntryAPI.create({
          projectId,
          date: dateStr,
          hours: parsedHours,
          description: 'Time logged via weekly grid',
        });
      }

      toast.success('Time entry updated');
      loadData();
    } catch (error) {
      toast.error('Failed to update time entry');
      console.error(error);
    }
  };

  const prevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    setWeekStart(prev);
  };

  const nextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Weekly Timesheet</h2>
        <div className="flex items-center space-x-2">
          <button onClick={goToCurrentWeek} className="btn-secondary text-sm">
            This Week
          </button>
          <button onClick={prevWeek} className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 min-w-[200px] text-center">
            {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
            {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button onClick={nextWeek} className="p-2 hover:bg-gray-100 rounded">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                Project
              </th>
              {weekDays.map((day, i) => (
                <th
                  key={i}
                  className={clsx(
                    'px-4 py-3 text-center text-xs font-medium uppercase tracking-wider min-w-[100px]',
                    day.toDateString() === new Date().toDateString()
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-500'
                  )}
                >
                  <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="font-normal">{day.getDate()}</div>
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.slice(0, 10).map((project) => (
              <tr key={project._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                  {project.name}
                </td>
                {weekDays.map((day, i) => {
                  const hours = getHoursForDay(project._id, day);
                  return (
                    <td
                      key={i}
                      onClick={() => handleCellClick(project._id, day)}
                      className={clsx(
                        'px-4 py-4 text-center cursor-pointer hover:bg-gray-100 transition-colors',
                        day.toDateString() === new Date().toDateString() && 'bg-primary-50',
                        hours > 0 && 'bg-green-50 font-medium text-green-800'
                      )}
                    >
                      {hours > 0 ? hours.toFixed(1) : '-'}
                    </td>
                  );
                })}
                <td className="px-4 py-4 text-center font-semibold text-gray-900 bg-gray-50">
                  {getProjectTotal(project._id).toFixed(1)}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  No projects found
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-100">
            <tr>
              <td className="px-6 py-4 text-sm font-semibold text-gray-900">Daily Total</td>
              {weekDays.map((day, i) => (
                <td key={i} className="px-4 py-4 text-center font-semibold text-gray-900">
                  {getDailyTotal(day).toFixed(1)}
                </td>
              ))}
              <td className="px-4 py-4 text-center font-bold text-primary-600">
                {getWeekTotal().toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
