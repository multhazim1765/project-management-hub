import { Outlet, Link } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/" className="flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-primary-600 font-bold text-2xl">P</span>
          </div>
        </Link>
        <h2 className="mt-4 text-center text-3xl font-bold text-white">
          ProjectHub
        </h2>
        <p className="mt-2 text-center text-sm text-primary-100">
          Manage your projects efficiently
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10">
          <Outlet />
        </div>
      </div>

      <p className="mt-8 text-center text-sm text-primary-100">
        &copy; {new Date().getFullYear()} ProjectHub. All rights reserved.
      </p>
    </div>
  );
}
