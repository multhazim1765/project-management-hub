import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function TaskCalendar({ tasks, onTaskClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);

  useEffect(() => {
    generateCalendar();
  }, [currentDate, tasks]);

  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const dayTasks = tasks.filter((task) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
        return taskDate === dateStr;
      });

      days.push({
        date: new Date(current),
        tasks: dayTasks,
        isCurrentMonth: current.getMonth() === month,
        isToday: dateStr === new Date().toISOString().split('T')[0],
      });

      current.setDate(current.getDate() + 1);
    }

    setCalendarDays(days);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">{monthName}</h2>
        <div className="flex space-x-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={clsx(
                'bg-white min-h-[100px] p-2',
                !day.isCurrentMonth && 'bg-gray-50',
                day.isToday && 'bg-blue-50'
              )}
            >
              <div
                className={clsx(
                  'text-sm font-medium mb-1',
                  !day.isCurrentMonth && 'text-gray-400',
                  day.isToday && 'text-primary-600'
                )}
              >
                {day.date.getDate()}
              </div>
              <div className="space-y-1">
                {day.tasks.slice(0, 3).map((task) => (
                  <div
                    key={task._id}
                    onClick={() => onTaskClick(task)}
                    className={clsx(
                      'text-xs px-2 py-1 rounded cursor-pointer truncate',
                      task.status === 'closed'
                        ? 'bg-green-100 text-green-800'
                        : task.priority === 'urgent'
                        ? 'bg-red-100 text-red-800'
                        : task.priority === 'high'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-blue-100 text-blue-800'
                    )}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
                {day.tasks.length > 3 && (
                  <div className="text-xs text-gray-500 px-2">
                    +{day.tasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
