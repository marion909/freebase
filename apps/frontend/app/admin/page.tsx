'use client';

import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Freebase</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-lg text-gray-900">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email Verified</p>
            <p className="text-lg text-gray-900">
              {user?.emailVerified ? '✓ Verified' : '✗ Not verified'}
            </p>
          </div>
          <div className="pt-4">
            <button
              onClick={handleLogout}
              className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
