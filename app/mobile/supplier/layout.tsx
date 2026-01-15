'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useSocket } from '@/contexts/SocketContext';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';

export default function SupplierMobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { socket } = useSocket();
  const { showToast } = useToast();
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!authLoading && user?.role !== 'supplier') {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  // Listen for new request notifications globally
  useEffect(() => {
    if (socket && user?.role === 'supplier') {
      socket.on('new_request', (data) => {
        // Show toast notification
        showToast(`New ${data.request?.bin_type_name || 'order'} request received!`, 'success');
        // Increment notification count if not on notifications page
        if (pathname !== '/mobile/supplier/notifications') {
          setNotificationCount(prev => prev + 1);
        }
      });

      return () => {
        socket.off('new_request');
      };
    }
  }, [socket, user, pathname, showToast]);

  // Reset notification count when on notifications page
  useEffect(() => {
    if (pathname === '/mobile/supplier/notifications') {
      setNotificationCount(0);
    }
  }, [pathname]);

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (user?.role !== 'supplier') {
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
        <Link href="/mobile/supplier/notifications" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#6B7280', position: 'relative' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem', position: 'relative' }}>
            🔔
            {notificationCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#EF4444',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem' }}>Requests</div>
        </Link>
        <Link href="/mobile/supplier/jobs" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📋</div>
          <div style={{ fontSize: '0.75rem' }}>Jobs</div>
        </Link>
        <Link href="/mobile/supplier/wallet" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', color: '#6B7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>💰</div>
          <div style={{ fontSize: '0.75rem' }}>Wallet</div>
        </Link>
      </nav>
    </div>
  );
}
