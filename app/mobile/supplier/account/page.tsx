'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

export default function SupplierAccountPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!confirm('Are you sure you want to logout?')) return;
    
    setLoggingOut(true);
    try {
      logout();
      showToast('Logged out successfully', 'success');
    } catch (error) {
      showToast('Failed to logout', 'error');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
          Account
        </h1>

        {/* Profile Info */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginRight: '16px'
            }}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{user?.phone}</div>
              {user?.email && (
                <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{user.email}</div>
              )}
            </div>
          </div>
        </div>

        {/* Account Details */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Account Details</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Role</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Phone</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                {user?.phone}
              </div>
            </div>
            {user?.email && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Email</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                  {user.email}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: loggingOut ? 'not-allowed' : 'pointer',
              opacity: loggingOut ? 0.6 : 1
            }}
          >
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </div>
  );
}
