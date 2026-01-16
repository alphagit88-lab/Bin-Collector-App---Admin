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
  start_date: string;
  end_date: string;
  status: string;
  supplier_name?: string;
  supplier_phone?: string;
  bin_code?: string;
  created_at: string;
}

const statusSteps = [
  { key: 'pending', label: 'Pending', icon: '⏳' },
  { key: 'quoted', label: 'Quoted', icon: '💬' },
  { key: 'accepted', label: 'Accepted', icon: '✅' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'in_progress', label: 'In Progress', icon: '🔄' },
  { key: 'loaded', label: 'Loaded', icon: '🚚' },
  { key: 'delivered', label: 'Delivered', icon: '📦' },
  { key: 'ready_to_pickup', label: 'Ready to Pickup', icon: '🔄' },
  { key: 'picked_up', label: 'Picked Up', icon: '✅' },
  { key: 'completed', label: 'Completed', icon: '🎉' },
];

export default function ServiceTrackingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { socket } = useSocket();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);

  useEffect(() => {
    if (user?.role !== 'customer') {
      router.push('/dashboard');
      return;
    }
    fetchRequests();

    if (socket) {
      socket.on('request_status_updated', (data) => {
        showToast('Status updated!', 'success');
        fetchRequests();
      });

      return () => {
        socket.off('request_status_updated');
      };
    }
  }, [user, router, socket]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ requests: ServiceRequest[] }>('/bookings/my-requests');
      if (response.success && response.data) {
        const activeRequests = response.data.requests.filter(
          r => !['completed', 'cancelled'].includes(r.status)
        );
        setRequests(activeRequests);
        if (activeRequests.length > 0 && !selectedRequest) {
          setSelectedRequest(activeRequests[0]);
        }
      }
    } catch (error) {
      showToast('Failed to load tracking data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = (status: string) => {
    return statusSteps.findIndex(step => step.key === status);
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
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
          Service Tracking
        </h1>

        {requests.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
            <div style={{ fontSize: '1.125rem', color: '#6B7280', marginBottom: '8px' }}>No active services</div>
            <Link href="/mobile/customer/order" style={{ color: '#10B981', textDecoration: 'none', cursor: 'pointer' }}>
              Order a bin
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Request Selector */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '8px' }}>Select Order</div>
              <select
                value={selectedRequest?.id || ''}
                onChange={(e) => {
                  const req = requests.find(r => r.id === parseInt(e.target.value));
                  setSelectedRequest(req || null);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                {requests.map(req => (
                  <option key={req.id} value={req.id}>
                    {req.request_id} - {req.bin_type_name} {req.bin_size}
                  </option>
                ))}
              </select>
            </div>

            {selectedRequest && (
              <>
                {/* Order Details */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Order Details</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Order ID</div>
                      <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.request_id}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Bin</div>
                      <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.bin_type_name} - {selectedRequest.bin_size}</div>
                    </div>
                    {selectedRequest.bin_code && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Bin Code</div>
                        <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.bin_code}</div>
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Location</div>
                      <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.location}</div>
                    </div>
                    {selectedRequest.supplier_name && (
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Supplier</div>
                        <div style={{ fontSize: '1rem', fontWeight: 500 }}>{selectedRequest.supplier_name}</div>
                        {selectedRequest.supplier_phone && (
                          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{selectedRequest.supplier_phone}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Timeline */}
                <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>Status Timeline</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {statusSteps.map((step, index) => {
                      const currentIndex = getCurrentStepIndex(selectedRequest.status);
                      const isCompleted = index <= currentIndex;
                      const isCurrent = index === currentIndex;

                      return (
                        <div key={step.key} style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem',
                            backgroundColor: isCompleted ? '#10B981' : '#E5E7EB',
                            color: isCompleted ? 'white' : '#6B7280',
                            flexShrink: 0
                          }}>
                            {step.icon}
                          </div>
                          <div style={{ flex: 1, paddingTop: '8px' }}>
                            <div style={{
                              fontSize: '1rem',
                              fontWeight: isCurrent ? 600 : 400,
                              color: isCompleted ? '#111827' : '#6B7280'
                            }}>
                              {step.label}
                            </div>
                            {isCurrent && (
                              <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '4px' }}>
                                Current Status
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
