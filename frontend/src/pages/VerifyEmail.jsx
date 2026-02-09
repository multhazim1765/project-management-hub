import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      authAPI.verifyEmail(token)
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'));
    } else {
      setStatus('error');
    }
  }, [token]);

  if (status === 'verifying') {
    return (
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600">Verifying your email...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="text-center">
        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Email Verified!</h2>
        <p className="mt-2 text-gray-600">Your email has been verified successfully.</p>
        <Link to="/login" className="btn-primary mt-6 inline-block">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <XCircleIcon className="w-16 h-16 text-red-500 mx-auto" />
      <h2 className="mt-4 text-2xl font-bold text-gray-900">Verification Failed</h2>
      <p className="mt-2 text-gray-600">The verification link is invalid or has expired.</p>
      <Link to="/login" className="btn-primary mt-6 inline-block">Back to Login</Link>
    </div>
  );
}
