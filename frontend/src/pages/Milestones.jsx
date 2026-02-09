import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { milestoneAPI } from '../services/api';
import { MILESTONE_STATUS } from '../constants';
import { PlusIcon, FlagIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function Milestones() {
  const { projectId } = useParams();
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    milestoneAPI.getByProject(projectId)
      .then((res) => setMilestones(res.data.data.milestones))
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Milestones</h2>
        <button className="btn-primary"><PlusIcon className="w-5 h-5 mr-2" />New Milestone</button>
      </div>
      {loading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton" />)}</div>
      ) : milestones.length > 0 ? (
        <div className="space-y-4">
          {milestones.map((m) => (
            <div key={m._id} className="card p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                    <FlagIcon className="w-5 h-5" />
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold">{m.name}</h3>
                    <p className="text-sm text-gray-500">Due: {new Date(m.dueDate).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={clsx('badge', m.status === 'completed' ? 'badge-success' : m.status === 'overdue' ? 'badge-danger' : 'badge-gray')}>{m.status}</span>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
                  <span>Progress</span><span>{m._progress || 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${m._progress || 0}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 card"><p className="text-gray-500">No milestones created</p></div>
      )}
    </div>
  );
}
