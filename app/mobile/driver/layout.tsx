'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function DriverMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authLoading && user?.role !== 'driver') {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (user?.role !== 'driver') {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
      {children}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '0.75rem 0',
        boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        <Link href="/mobile/driver/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: pathname === '/mobile/driver/dashboard' ? '#10B981' : '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🏠</div>
          <div style={{ fontSize: '0.75rem' }}>Dashboard</div>
        </Link>
        <Link href="/mobile/driver/jobs" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: pathname === '/mobile/driver/jobs' ? '#10B981' : '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📋</div>
          <div style={{ fontSize: '0.75rem' }}>My Jobs</div>
        </Link>
        <Link href="/mobile/driver/account" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: pathname === '/mobile/driver/account' ? '#10B981' : '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>👤</div>
          <div style={{ fontSize: '0.75rem' }}>Account</div>
        </Link>
      </nav>
    </div>
  );
}
