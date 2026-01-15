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
  created_at: string;
}

export default function SupplierNotificationsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { socket } = useSocket();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    fetchPendingRequests();

    if (socket) {
      socket.on('new_request', (data) => {
        // Show prominent notification
        showToast(`New ${data.request?.bin_type_name || 'order'} request received!`, 'success');
        // Refresh the requests list
        fetchPendingRequests();
      });

      return () => {
        socket.off('new_request');
      };
    }
  }, [user, router, socket]);

  const fetchPendingRequests = async () => {
    setLoading(true);
    const response = await api.get<{ requests: ServiceRequest[] }>('/bookings/supplier/pending');
    if (response.success && response.data) {
      setRequests(response.data.requests);
    }
    setLoading(false);
  };

  const handleAccept = async (requestId: string) => {
    try {
      const request = requests.find(r => r.request_id === requestId);
      if (!request) return;

      const response = await api.post(`/bookings/${request.id}/accept`);
      if (response.success) {
        showToast('Request accepted! Please submit your quote.', 'success');
        router.push(`/mobile/supplier/quote/${request.id}`);
      } else {
        showToast(response.message || 'Failed to accept request', 'error');
      }
    } catch (error) {
      showToast('Failed to accept request', 'error');
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>New Requests</h1>
        <Link
          href="/mobile/supplier/jobs"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#10B981',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 500
          }}
        >
          My Jobs
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
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔔</div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No New Requests</div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            You'll be notified when new orders come in.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map((request) => (
            <div
              key={request.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{request.bin_type_name} - {request.bin_size}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{request.request_id}</div>
                </div>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  backgroundColor: '#F59E0B20',
                  color: '#F59E0B'
                }}>
                  NEW
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                👤 {request.customer_name} - {request.customer_phone}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                📍 {request.location}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>
                📅 {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
              </div>
              <button
                onClick={() => handleAccept(request.request_id)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Accept & Quote
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
