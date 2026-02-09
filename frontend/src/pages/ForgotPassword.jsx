import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Check your email</h2>
        <p className="mt-4 text-gray-600">
          We've sent a password reset link to <strong>{email}</strong>
        </p>
        <Link to="/login" className="btn-primary mt-6 inline-block">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 text-center">
        Forgot your password?
      </h2>
      <p className="mt-2 text-sm text-gray-600 text-center">
        Enter your email and we'll send you a reset link
      </p>

      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
          />
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-3">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>

        <p className="text-center">
          <Link to="/login" className="text-primary-600 hover:text-primary-500 text-sm">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}
