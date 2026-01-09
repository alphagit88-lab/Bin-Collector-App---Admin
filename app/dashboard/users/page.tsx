'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: 'admin' | 'customer' | 'supplier';
  created_at: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect to customers page by default
    if (user?.role === 'admin') {
      router.replace('/dashboard/users/customers');
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
        <p className="font-light" style={{ color: 'var(--color-text-secondary)' }}>Redirecting...</p>
      </div>
    </div>
  );
}
