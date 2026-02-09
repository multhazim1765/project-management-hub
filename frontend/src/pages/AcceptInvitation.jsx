import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.acceptInvitation({ token, ...formData });
      toast.success('Invitation accepted! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-red-600">Invalid Invitation</h2>
        <p className="mt-4 text-gray-600">This invitation link is invalid or has expired.</p>
        <Link to="/login" className="btn-primary mt-6 inline-block">Go to Login</Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 text-center">Accept Invitation</h2>
      <p className="mt-2 text-sm text-gray-600 text-center">Complete your profile to join the organization</p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input type="text" required className="input" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input type="text" required className="input" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" required className="input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} placeholder="At least 8 characters" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? 'Joining...' : 'Accept & Join'}</button>
      </form>
    </div>
  );
}
