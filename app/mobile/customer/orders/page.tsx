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
  status: string;
  payment_status: string;
  created_at: string;
}

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { socket } = useSocket();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'customer') {
      router.push('/dashboard');
      return;
    }
    fetchRequests();

    if (socket) {
      socket.on('new_quote', (data) => {
        showToast('New quote received!', 'success');
        fetchRequests();
      });

      socket.on('request_status_updated', (data) => {
        fetchRequests();
      });

      return () => {
        socket.off('new_quote');
        socket.off('request_status_updated');
      };
    }
  }, [user, router, socket]);

  const fetchRequests = async () => {
    setLoading(true);
    const response = await api.get<{ requests: ServiceRequest[] }>('/bookings/my-requests');
    if (response.success && response.data) {
      setRequests(response.data.requests);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'quoted': return '#3B82F6';
      case 'accepted': return '#10B981';
      case 'confirmed': return '#10B981';
      case 'in_progress': return '#6366F1';
      case 'completed': return '#059669';
      default: return '#6B7280';
    }
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>My Orders</h1>
        <Link
          href="/mobile/customer/order"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#10B981',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          + New Order
        </Link>
      </div>

      {requests.length === 0 ? (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ color: '#6B7280', marginBottom: '1rem' }}>No orders yet</p>
          <Link
            href="/mobile/customer/order"
            style={{
              display: 'inline-block',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10B981',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            Place Your First Order
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map((request) => (
            <Link
              key={request.id}
              href={`/mobile/customer/orders/${request.request_id}`}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1rem',
                textDecoration: 'none',
                color: 'inherit',
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
                📍 {request.location}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
                📅 {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
