'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user?.role === 'admin') {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <main className="py-20 min-h-screen flex items-center justify-center px-6 bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (user?.role === 'admin') {
    return null;
  }

  return (
    <main className="py-20 min-h-screen flex items-center justify-center px-6 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
        <h1 className="text-3xl font-bold text-black mb-4">Admin Access Only</h1>
        <p className="text-sm text-gray-600 mb-6">
          This application does not support public sign up. Administrator accounts must be created by an existing administrator.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center w-full h-10 rounded-md bg-[#10B981] text-white font-medium hover:bg-[#059669] transition-colors"
        >
          Back to Login
        </Link>
      </div>
    </main>
  );
}
