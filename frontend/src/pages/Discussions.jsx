import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { discussionAPI } from '../services/api';
import { PlusIcon, ChatBubbleLeftRightIcon, ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Discussions() {
  const { projectId } = useParams();
  const [discussions, setDiscussions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDiscussions();
  }, [projectId]);

  const fetchDiscussions = async () => {
    try {
      const response = await discussionAPI.getByProject(projectId, { limit: 50 });
      setDiscussions(response.data.data.discussions);
    } catch (error) {
      toast.error('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Discussions</h2>
        <button className="btn-primary"><PlusIcon className="w-5 h-5 mr-2" />New Discussion</button>
      </div>

      {loading ? (
        <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-24 skeleton" />)}</div>
      ) : discussions.length > 0 ? (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <div key={discussion._id} className="card p-6 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-start">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium">
                    {discussion.createdBy?.firstName?.[0]}
                  </div>
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900">{discussion.title}</h3>
                    <p className="text-sm text-gray-500">
                      Started by {discussion.createdBy?.firstName} {discussion.createdBy?.lastName} &middot; {new Date(discussion.createdAt).toLocaleDateString()}
                    </p>
                    {discussion.content && (
                      <p className="text-gray-600 mt-2 line-clamp-2">{discussion.content}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center text-gray-500">
                  <ChatBubbleOvalLeftIcon className="w-5 h-5 mr-1" />
                  <span>{discussion.repliesCount || 0}</span>
                </div>
              </div>
              {discussion.tags?.length > 0 && (
                <div className="flex gap-2 mt-4 ml-14">
                  {discussion.tags.map((tag, idx) => (
                    <span key={idx} className="badge badge-gray">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 card">
          <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No discussions yet</p>
          <p className="text-sm text-gray-400 mt-1">Start a conversation with your team</p>
        </div>
      )}
    </div>
  );
}
