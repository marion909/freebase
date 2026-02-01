'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';
import toast from 'react-hot-toast';

export const dynamic = 'force-dynamic';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      toast.error('Invalid verification link');
      setIsVerifying(false);
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      await authApi.verifyEmail(token);
      setIsSuccess(true);
      toast.success('Email verified successfully!');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      setIsSuccess(false);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Email Verification
          </h2>
        </div>

        {isVerifying && (
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600">Verifying your email...</p>
          </div>
        )}

        {!isVerifying && isSuccess && (
          <div className="space-y-4">
            <div className="text-green-600 text-6xl">✓</div>
            <p className="text-xl text-gray-900">Email verified successfully!</p>
            <p className="text-gray-600">You can now sign in to your account.</p>
            <div className="mt-6">
              <Link
                href="/auth/login"
                className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        )}

        {!isVerifying && !isSuccess && (
          <div className="space-y-4">
            <div className="text-red-600 text-6xl">✗</div>
            <p className="text-xl text-gray-900">Verification failed</p>
            <p className="text-gray-600">
              The verification link is invalid or has expired.
            </p>
            <div className="mt-6">
              <Link
                href="/auth/register"
                className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Register Again
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
