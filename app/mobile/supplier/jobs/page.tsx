'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSocket } from '@/contexts/SocketContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface ServiceRequest {
  id: number;
  request_id: string;
  service_category: string;
  bin_type_name: string;
  bin_size: string;
  location: string;
  start_date: string;
  end_date: string;
  customer_name: string;
  customer_phone: string;
  status: string;
  payment_status: string;
  created_at: string;
}

export default function SupplierJobsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { socket } = useSocket();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    fetchRequests();

    if (socket) {
      socket.on('quote_accepted', (data) => {
        showToast('Quote accepted! Payment received.', 'success');
        fetchRequests();
      });

      socket.on('payment_received', (data) => {
        showToast('Payment received!', 'success');
        fetchRequests();
      });

      return () => {
        socket.off('quote_accepted');
        socket.off('payment_received');
      };
    }
  }, [user, router, socket, filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
    const response = await api.get<{ requests: ServiceRequest[] }>(`/bookings/supplier/requests${params}`);
    if (response.success && response.data) {
      setRequests(response.data.requests);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      const request = requests.find(r => r.request_id === requestId);
      if (!request) return;

      const response = await api.put(`/bookings/${request.id}/status`, { status: newStatus });
      if (response.success) {
        showToast('Status updated successfully', 'success');
        fetchRequests();
      } else {
        showToast(response.message || 'Failed to update status', 'error');
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'quoted': return '#3B82F6';
      case 'accepted': return '#10B981';
      case 'confirmed': return '#10B981';
      case 'in_progress': return '#6366F1';
      case 'completed': return '#059669';
      default: return '#6B7280';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow = {
      'quoted': 'accepted',
      'accepted': 'confirmed',
      'confirmed': 'in_progress',
      'in_progress': 'completed',
    };
    return statusFlow[currentStatus as keyof typeof statusFlow] || null;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      padding: '1rem',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Jobs</h1>
        <Link
          href="/mobile/supplier/notifications"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#10B981',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          New Requests
        </Link>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilterStatus('all')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: filterStatus === 'all' ? '#10B981' : 'white',
            color: filterStatus === 'all' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          All
        </button>
        <button
          onClick={() => setFilterStatus('quoted')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: filterStatus === 'quoted' ? '#10B981' : 'white',
            color: filterStatus === 'quoted' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Quoted
        </button>
        <button
          onClick={() => setFilterStatus('confirmed')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: filterStatus === 'confirmed' ? '#10B981' : 'white',
            color: filterStatus === 'confirmed' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Confirmed
        </button>
        <button
          onClick={() => setFilterStatus('in_progress')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: filterStatus === 'in_progress' ? '#10B981' : 'white',
            color: filterStatus === 'in_progress' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          In Progress
        </button>
        <button
          onClick={() => setFilterStatus('completed')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: filterStatus === 'completed' ? '#10B981' : 'white',
            color: filterStatus === 'completed' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Completed
        </button>
      </div>

      {requests.length === 0 ? (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No Jobs Found</div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            {filterStatus === 'all' ? 'You have no jobs yet.' : `No ${filterStatus.replace('_', ' ')} jobs.`}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map((request) => {
            const nextStatus = getNextStatus(request.status);
            return (
              <div
                key={request.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '1rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{request.bin_type_name} - {request.bin_size}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{request.request_id}</div>
                  </div>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: getStatusColor(request.status) + '20',
                    color: getStatusColor(request.status)
                  }}>
                    {request.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.5rem' }}>
                  👤 {request.customer_name} - {request.customer_phone}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  📍 {request.location}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                  📅 {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                </div>
                {request.payment_status === 'paid' && (
                  <div style={{ 
                    padding: '0.5rem', 
                    backgroundColor: '#10B98120', 
                    borderRadius: '6px',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    color: '#10B981',
                    fontWeight: 500
                  }}>
                    ✓ Payment Received
                  </div>
                )}
                {nextStatus && (
                  <button
                    onClick={() => handleUpdateStatus(request.request_id, nextStatus)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    Mark as {nextStatus.replace('_', ' ')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
