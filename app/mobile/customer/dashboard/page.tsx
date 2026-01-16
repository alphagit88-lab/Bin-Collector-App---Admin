'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useSocket } from '@/contexts/SocketContext';
import Link from 'next/link';
import { api } from '@/lib/api';

interface ServiceRequest {
  id: number;
  request_id: string;
  bin_type_name: string;
  bin_size: string;
  location: string;
  status: string;
  payment_status: string;
  created_at: string;
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { socket } = useSocket();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeBookings: 0,
    pendingQuotes: 0,
    completed: 0,
  });

  useEffect(() => {
    if (user?.role !== 'customer') {
      router.push('/dashboard');
      return;
    }
    fetchData();

    if (socket) {
      socket.on('new_quote', (data) => {
        showToast('New quote received!', 'success');
        fetchData();
      });

      socket.on('request_status_updated', (data) => {
        fetchData();
      });

      return () => {
        socket.off('new_quote');
        socket.off('request_status_updated');
      };
    }
  }, [user, router, socket]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ requests: ServiceRequest[] }>('/bookings/my-requests');
      if (response.success && response.data) {
        const allRequests = response.data.requests;
        setRequests(allRequests.slice(0, 5)); // Show recent 5

        // Calculate stats
        setStats({
          activeBookings: allRequests.filter(r => ['confirmed', 'loaded', 'delivered', 'ready_to_pickup', 'picked_up', 'in_progress'].includes(r.status)).length,
          pendingQuotes: allRequests.filter(r => r.status === 'pending' || r.status === 'quoted').length,
          completed: allRequests.filter(r => r.status === 'completed').length,
        });
      }
    } catch (error) {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'quoted': return '#3B82F6';
      case 'confirmed': return '#10B981';
      case 'loaded': return '#6366F1';
      case 'delivered': return '#8B5CF6';
      case 'ready_to_pickup': return '#EC4899';
      case 'picked_up': return '#14B8A6';
      case 'completed': return '#059669';
      default: return '#6B7280';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            Welcome back, {user?.name}!
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>Manage your waste bin rentals</p>
        </div>

        {/* Quick Action */}
        <Link href="/mobile/customer/order" style={{ textDecoration: 'none', display: 'block', marginBottom: '24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '4px' }}>Order New Bin</div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Get a bin delivered to your location</div>
            </div>
            <div style={{ fontSize: '2rem' }}>➕</div>
          </div>
        </Link>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981', marginBottom: '4px' }}>{stats.activeBookings}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Active</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F59E0B', marginBottom: '4px' }}>{stats.pendingQuotes}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Pending</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3B82F6', marginBottom: '4px' }}>{stats.completed}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Completed</div>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <Link href="/mobile/customer/tracking" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📍</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>Tracking</div>
            </div>
          </Link>
          <Link href="/mobile/customer/payments" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💳</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>Payments</div>
            </div>
          </Link>
        </div>

        {/* Recent Bookings */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Recent Bookings</h2>
            <Link href="/mobile/customer/orders" style={{ fontSize: '0.875rem', color: '#10B981', textDecoration: 'none', cursor: 'pointer' }}>
              View All
            </Link>
          </div>

          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📦</div>
              <div>No bookings yet</div>
              <Link href="/mobile/customer/order" style={{ display: 'inline-block', marginTop: '12px', color: '#10B981', textDecoration: 'none', cursor: 'pointer' }}>
                Order your first bin
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/mobile/customer/orders/${request.request_id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{
                    padding: '16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#10B981';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                          {request.bin_type_name} - {request.bin_size}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{request.request_id}</div>
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: getStatusColor(request.status) + '20',
                        color: getStatusColor(request.status)
                      }}>
                        {formatStatus(request.status)}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '8px' }}>
                      📍 {request.location}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
