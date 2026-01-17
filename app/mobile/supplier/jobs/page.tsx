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
  bin_id?: number;
  bin_code?: string;
  created_at: string;
}

interface PhysicalBin {
  id: number;
  bin_code: string;
  bin_type_name: string;
  bin_size: string;
  status: string;
}

export default function SupplierJobsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { socket } = useSocket();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showBinModal, setShowBinModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [availableBins, setAvailableBins] = useState<PhysicalBin[]>([]);
  const [selectedBinCode, setSelectedBinCode] = useState<string>('');

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    fetchRequests();

    if (socket) {
      socket.on('request_accepted', (data) => {
        showToast('Request accepted and confirmed!', 'success');
        fetchRequests();
      });

      socket.on('payment_received', (data) => {
        showToast('Payment received!', 'success');
        fetchRequests();
      });

      return () => {
        socket.off('request_accepted');
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

  const fetchAvailableBins = async (request: ServiceRequest) => {
    try {
      const response = await api.get<any>(`/bins/physical?status=available&supplier_id=${user?.id}`);
      if (response.success) {
        const bins = (response as any).bins || response.data?.bins || [];
        // Filter bins matching the request's bin type and size
        const matchingBins = bins.filter((bin: any) => 
          bin.bin_type_name === request.bin_type_name && bin.bin_size === request.bin_size
        );
        setAvailableBins(matchingBins);
      }
    } catch (error) {
      console.error('Failed to fetch available bins:', error);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      const request = requests.find(r => r.request_id === requestId);
      if (!request) return;

      // If status is on_delivery, show bin assignment modal
      if (newStatus === 'on_delivery') {
        setSelectedRequest(request);
        await fetchAvailableBins(request);
        setShowBinModal(true);
        return;
      }

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

  const handleAssignBin = async () => {
    if (!selectedRequest || !selectedBinCode) {
      showToast('Please select a bin', 'error');
      return;
    }

    try {
      const response = await api.put(`/bookings/${selectedRequest.id}/status`, { 
        status: 'on_delivery',
        bin_code: selectedBinCode
      });
      if (response.success) {
        showToast('Bin assigned and status updated successfully', 'success');
        setShowBinModal(false);
        setSelectedRequest(null);
        setSelectedBinCode('');
        fetchRequests();
      } else {
        showToast(response.message || 'Failed to assign bin', 'error');
      }
    } catch (error) {
      showToast('Failed to assign bin', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return '#10B981';
      case 'on_delivery': return '#6366F1';
      case 'delivered': return '#F59E0B';
      case 'ready_to_pickup': return '#EC4899';
      case 'pickup': return '#14B8A6';
      case 'completed': return '#059669';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      'confirmed': 'on_delivery',
      'on_delivery': 'delivered',
      'delivered': 'ready_to_pickup',
      'ready_to_pickup': 'pickup',
      'pickup': 'completed',
    };
    return statusFlow[currentStatus] || null;
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
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
          onClick={() => setFilterStatus('on_delivery')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: filterStatus === 'on_delivery' ? '#10B981' : 'white',
            color: filterStatus === 'on_delivery' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          On Delivery
        </button>
        <button
          onClick={() => setFilterStatus('delivered')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: filterStatus === 'delivered' ? '#10B981' : 'white',
            color: filterStatus === 'delivered' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Delivered
        </button>
        <button
          onClick={() => setFilterStatus('ready_to_pickup')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: filterStatus === 'ready_to_pickup' ? '#10B981' : 'white',
            color: filterStatus === 'ready_to_pickup' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Ready to Pickup
        </button>
        <button
          onClick={() => setFilterStatus('pickup')}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: filterStatus === 'pickup' ? '#10B981' : 'white',
            color: filterStatus === 'pickup' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          Pickup
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
                    {formatStatus(request.status).toUpperCase()}
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
                {request.bin_code && (
                  <div style={{ 
                    padding: '0.5rem', 
                    backgroundColor: '#F3F4F6', 
                    borderRadius: '6px',
                    marginBottom: '0.75rem',
                    fontSize: '0.875rem',
                    color: '#374151',
                    fontWeight: 500
                  }}>
                    📦 Bin: {request.bin_code}
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
                    {nextStatus === 'on_delivery' ? 'Assign Bin & Mark On Delivery' : `Mark as ${formatStatus(nextStatus)}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bin Assignment Modal */}
      {showBinModal && selectedRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
              Assign Bin to Order
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>
              Select an available bin for this order. You can only assign bins registered under your name.
            </p>
            
            {availableBins.length === 0 ? (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                color: '#6B7280' 
              }}>
                No available bins matching this order's requirements
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {availableBins.map((bin) => (
                  <button
                    key={bin.id}
                    type="button"
                    onClick={() => setSelectedBinCode(bin.bin_code)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: selectedBinCode === bin.bin_code ? '#10B981' : '#E5E7EB',
                      backgroundColor: selectedBinCode === bin.bin_code ? '#10B98120' : 'white',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{bin.bin_code}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                      {bin.bin_type_name} - {bin.bin_size}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowBinModal(false);
                  setSelectedRequest(null);
                  setSelectedBinCode('');
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignBin}
                disabled={!selectedBinCode || availableBins.length === 0}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedBinCode ? '#10B981' : '#D1D5DB',
                  color: 'white',
                  fontWeight: 600,
                  cursor: selectedBinCode ? 'pointer' : 'not-allowed'
                }}
              >
                Assign & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
