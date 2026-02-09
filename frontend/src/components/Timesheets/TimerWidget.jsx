import { useState, useEffect } from 'react';
import { timerAPI } from '../../services/api';
import { PlayIcon, PauseIcon, StopIcon, ClockIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function TimerWidget() {
  const [timer, setTimer] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    loadActiveTimer();
    const interval = setInterval(loadActiveTimer, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timer && timer.status === 'running') {
      const interval = setInterval(() => {
        const start = new Date(timer.startTime);
        const now = new Date();
        const totalSeconds = Math.floor((now - start) / 1000);
        setElapsed(totalSeconds);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const loadActiveTimer = async () => {
    try {
      const response = await timerAPI.getActive();
      setTimer(response.data.data.timer);
      if (response.data.data.timer && response.data.data.timer.status === 'running') {
        const start = new Date(response.data.data.timer.startTime);
        const now = new Date();
        const totalSeconds = Math.floor((now - start) / 1000);
        setElapsed(totalSeconds);
      }
    } catch (error) {
      // No active timer
      setTimer(null);
    }
  };

  const handleStop = async () => {
    try {
      await timerAPI.stop({ description: 'Time tracked' });
      toast.success('Timer stopped and time logged');
      setTimer(null);
      setElapsed(0);
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!timer) return null;

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg cursor-pointer hover:bg-primary-700 transition-colors flex items-center space-x-2 z-50"
      >
        <ClockIcon className="w-5 h-5" />
        <span className="font-mono font-semibold">{formatTime(elapsed)}</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-72 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Active Timer</h3>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          _
        </button>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-mono font-bold text-primary-600">
          {formatTime(elapsed)}
        </div>
        {timer.taskId && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {timer.taskId.title || 'Task'}
          </p>
        )}
      </div>

      <div className="flex justify-center space-x-2">
        <button
          onClick={handleStop}
          className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          <StopIcon className="w-4 h-4" />
          <span>Stop</span>
        </button>
      </div>
    </div>
  );
}
