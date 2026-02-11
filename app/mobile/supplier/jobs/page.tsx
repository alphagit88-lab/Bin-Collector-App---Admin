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
  order_items_count?: number;
  attachment_url?: string;
}

interface PhysicalBin {
  id: number;
  bin_code: string;
  bin_type_name: string;
  bin_size: string;
  status: string;
}

interface OrderItem {
  id: number;
  bin_type_id: number;
  bin_size_id: number;
  bin_type_name: string;
  bin_size: string;
  physical_bin_id?: number;
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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [availableBinsMap, setAvailableBinsMap] = useState<Record<number, PhysicalBin[]>>({});
  const [selectedBinCodes, setSelectedBinCodes] = useState<Record<number, string>>({});

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

  const fetchOrderItems = async (requestId: number) => {
    try {
      const response = await api.get<{ orderItems: OrderItem[] }>(`/bookings/${requestId}/order-items`);
      if (response.success && response.data) {
        const items = response.data.orderItems;
        setOrderItems(items);

        // Fetch available bins for each order item
        const binsMap: Record<number, PhysicalBin[]> = {};
        const allBinsResponse = await api.get<any>(`/bins/physical?status=available&supplier_id=${user?.id}`);
        if (allBinsResponse.success) {
          const allBins = (allBinsResponse as any).bins || allBinsResponse.data?.bins || [];

          items.forEach((item) => {
            const matchingBins = allBins.filter((bin: any) =>
              bin.bin_type_name === item.bin_type_name && bin.bin_size === item.bin_size
            );
            binsMap[item.id] = matchingBins;
          });
        }
        setAvailableBinsMap(binsMap);
      }
    } catch (error) {
      console.error('Failed to fetch order items:', error);
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      const request = requests.find(r => r.request_id === requestId);
      if (!request) return;

      // If status is on_delivery, show bin assignment modal
      if (newStatus === 'on_delivery') {
        setSelectedRequest(request);
        await fetchOrderItems(request.id);
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
    if (!selectedRequest) {
      showToast('Please select a request', 'error');
      return;
    }

    // Check if all order items have bins selected
    const allSelected = orderItems.every(item => selectedBinCodes[item.id]);
    if (!allSelected) {
      showToast('Please select a bin for all order items', 'error');
      return;
    }

    try {
      const binCodesArray = orderItems.map(item => selectedBinCodes[item.id]);
      const response = await api.put(`/bookings/${selectedRequest.id}/status`, {
        status: 'on_delivery',
        bin_codes: binCodesArray
      });
      if (response.success) {
        showToast('Bins assigned and status updated successfully', 'success');
        setShowBinModal(false);
        setSelectedRequest(null);
        setOrderItems([]);
        setAvailableBinsMap({});
        setSelectedBinCodes({});
        fetchRequests();
      } else {
        showToast(response.message || 'Failed to assign bins', 'error');
      }
    } catch (error) {
      showToast('Failed to assign bins', 'error');
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
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                      {request.bin_type_name} - {request.bin_size}
                      {request.order_items_count && request.order_items_count > 1 && (
                        <span style={{ color: '#6B7280', fontWeight: 400, marginLeft: '0.5rem' }}>
                          + more {request.order_items_count - 1}
                        </span>
                      )}
                    </div>
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

                {request.attachment_url && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
                      Attachment:
                    </div>
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}${request.attachment_url}`}
                      alt="Attachment"
                      style={{
                        width: '100%',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB'
                      }}
                    />
                  </div>
                )}

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
              Assign Bins to Order
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>
              Select an available bin for each order item. You can only assign bins registered under your name.
            </p>

            {orderItems.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6B7280'
              }}>
                Loading order items...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem', maxHeight: '50vh', overflowY: 'auto' }}>
                {orderItems.map((item) => {
                  const availableBins = availableBinsMap[item.id] || [];
                  const selectedBin = selectedBinCodes[item.id];

                  return (
                    <div key={item.id} style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '1rem' }}>
                      <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                          {item.bin_type_name} - {item.bin_size}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                          Status: {item.status}
                        </div>
                      </div>

                      {availableBins.length === 0 ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#EF4444', fontSize: '0.875rem' }}>
                          No available bins matching this requirement
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {availableBins.map((bin) => (
                            <button
                              key={bin.id}
                              type="button"
                              onClick={() => setSelectedBinCodes({ ...selectedBinCodes, [item.id]: bin.bin_code })}
                              style={{
                                padding: '0.75rem',
                                borderRadius: '8px',
                                border: '2px solid',
                                borderColor: selectedBin === bin.bin_code ? '#10B981' : '#E5E7EB',
                                backgroundColor: selectedBin === bin.bin_code ? '#10B98120' : 'white',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>{bin.bin_code}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => {
                  setShowBinModal(false);
                  setSelectedRequest(null);
                  setOrderItems([]);
                  setAvailableBinsMap({});
                  setSelectedBinCodes({});
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
                disabled={orderItems.length === 0 || !orderItems.every(item => selectedBinCodes[item.id])}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: orderItems.every(item => selectedBinCodes[item.id]) ? '#10B981' : '#D1D5DB',
                  color: 'white',
                  fontWeight: 600,
                  cursor: orderItems.every(item => selectedBinCodes[item.id]) ? 'pointer' : 'not-allowed'
                }}
              >
                Assign All & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
