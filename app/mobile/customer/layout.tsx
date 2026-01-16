'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CustomerMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user?.role !== 'customer') {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (user?.role !== 'customer') {
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
        <Link href="/mobile/customer/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>🏠</div>
          <div style={{ fontSize: '0.75rem' }}>Dashboard</div>
        </Link>
        <Link href="/mobile/customer/order" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>➕</div>
          <div style={{ fontSize: '0.75rem' }}>Order Bin</div>
        </Link>
        <Link href="/mobile/customer/orders" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📋</div>
          <div style={{ fontSize: '0.75rem' }}>My Bookings</div>
        </Link>
        <Link href="/mobile/customer/tracking" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📍</div>
          <div style={{ fontSize: '0.75rem' }}>Tracking</div>
        </Link>
        <Link href="/mobile/customer/account" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>👤</div>
          <div style={{ fontSize: '0.75rem' }}>Account</div>
        </Link>
      </nav>
    </div>
  );
}
