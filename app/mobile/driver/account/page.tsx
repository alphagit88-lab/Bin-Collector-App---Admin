'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

export default function DriverAccountPage() {
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
          My Profile
        </h1>

        {/* Profile Info */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '1.5rem',
              fontWeight: 600,
              marginRight: '16px'
            }}>
              {user?.name?.charAt(0).toUpperCase() || 'D'}
            </div>
            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Driver Account</div>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Phone Number</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.phone}</div>
            </div>
            {user?.email && (
              <div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Email</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user.email}</div>
              </div>
            )}
          </div>
        </div>

        {/* Support Card */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>Support</h2>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '16px' }}>Need help with an assigned job? Contact your supplier.</p>
          <button 
             style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: 'white', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' }}
             onClick={() => showToast('Please contact your supplier directly.', 'success')}
          >
              Contact Supplier
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#FEF2F2',
            color: '#EF4444',
            border: 'none',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: loggingOut ? 'not-allowed' : 'pointer',
            opacity: loggingOut ? 0.6 : 1
          }}
        >
          {loggingOut ? 'Logging out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
