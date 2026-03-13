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

export default function DriverJobsPage() {
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
    if (user?.role !== 'driver') {
      router.push('/dashboard');
      return;
    }
    fetchRequests();

    if (socket) {
      socket.on('status_update', (data) => {
        if (data.status === 'assigned') {
            showToast('New job assigned to you!', 'success');
            fetchRequests();
        }
      });

      return () => {
        socket.off('status_update');
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

        // Fetch available bins for the supplier this driver belongs to
        const binsMap: Record<number, PhysicalBin[]> = {};
        const supplierId = user?.supplierId;
        
        if (supplierId) {
            const allBinsResponse = await api.get<any>(`/bins/physical?status=available&supplier_id=${supplierId}`);
            if (allBinsResponse.success) {
              const allBins = (allBinsResponse as any).bins || allBinsResponse.data?.bins || [];

              items.forEach((item) => {
                const matchingBins = allBins.filter((bin: any) =>
                  bin.bin_type_name === item.bin_type_name && bin.bin_size === item.bin_size
                );
                binsMap[item.id] = matchingBins;
              });
            }
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

      if (newStatus === 'on_delivery' && request.service_category !== 'service') {
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
    if (!selectedRequest) return;

    const allSelected = orderItems.every(item => selectedBinCodes[item.id]);
    if (!allSelected) {
      showToast('Please select a bin for all specimens', 'error');
      return;
    }

    try {
      const binCodesArray = orderItems.map(item => selectedBinCodes[item.id]);
      const response = await api.put(`/bookings/${selectedRequest.id}/status`, {
        status: 'on_delivery',
        bin_codes: binCodesArray
      });
      if (response.success) {
        showToast('Bins assigned and job started', 'success');
        setShowBinModal(false);
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
      default: return '#6B7280';
    }
  };

  const getNextStatus = (currentStatus: string, category: string) => {
    if (category === 'service') {
        const flow: Record<string, string> = {
            'confirmed': 'completed'
        };
        return flow[currentStatus] || null;
    }
    
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
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading jobs...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '20px' }}>My Assigned Jobs</h1>
      
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '20px' }}>
        {['all', 'confirmed', 'on_delivery', 'delivered', 'ready_to_pickup', 'pickup', 'completed'].map(s => (
            <button 
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                    whiteSpace: 'nowrap',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: filterStatus === s ? '#10B981' : 'white',
                    color: filterStatus === s ? 'white' : '#6B7280',
                    fontSize: '0.875rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    cursor: 'pointer'
                }}
            >
                {formatStatus(s)}
            </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', color: '#9CA3AF' }}>
                No jobs found in this category
            </div>
        ) : (
            requests.map(request => {
                const nextStatus = getNextStatus(request.status, request.service_category);
                return (
                    <div key={request.id} style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <span style={{ 
                                fontSize: '0.75rem', 
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                backgroundColor: getStatusColor(request.status) + '15',
                                color: getStatusColor(request.status),
                                fontWeight: 700
                            }}>
                                {formatStatus(request.status).toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{request.request_id}</span>
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>
                            {request.bin_type_name || 'Service'} {request.bin_size ? `- ${request.bin_size}` : ''}
                        </h3>
                        <div style={{ fontSize: '0.875rem', color: '#4B5563', marginBottom: '16px' }}>
                             📍 {request.location}
                        </div>
                        
                        <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '12px', marginBottom: '16px' }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Customer: {request.customer_name}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>📞 {request.customer_phone}</div>
                        </div>

                        {nextStatus && (
                            <button 
                                onClick={() => handleUpdateStatus(request.request_id, nextStatus)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: '#10B981',
                                    color: 'white',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                {nextStatus === 'on_delivery' ? 'Start Delivery' : `Mark as ${formatStatus(nextStatus)}`}
                            </button>
                        )}
                    </div>
                );
            })
        )}
      </div>

      {showBinModal && selectedRequest && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1000 }}>
              <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px' }}>Assign Bins</h2>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '20px' }}>Assign physical bins for this delivery.</p>
                  
                  {orderItems.map(item => (
                      <div key={item.id} style={{ marginBottom: '20px', padding: '12px', border: '1px solid #E5E7EB', borderRadius: '8px' }}>
                          <div style={{ fontWeight: 600, marginBottom: '10px' }}>{item.bin_type_name} ({item.bin_size})</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                              {(availableBinsMap[item.id] || []).map(bin => (
                                  <button 
                                    key={bin.id}
                                    onClick={() => setSelectedBinCodes({...selectedBinCodes, [item.id]: bin.bin_code})}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '6px',
                                        border: '2px solid',
                                        borderColor: selectedBinCodes[item.id] === bin.bin_code ? '#10B981' : '#F3F4F6',
                                        backgroundColor: selectedBinCodes[item.id] === bin.bin_code ? '#F0FDF4' : 'white',
                                        cursor: 'pointer'
                                    }}
                                  >
                                      {bin.bin_code}
                                  </button>
                              ))}
                          </div>
                      </div>
                  ))}

                  <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={handleAssignBin} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: 'white', fontWeight: 600, cursor: 'pointer' }}>Confirm Assignment</button>
                      <button onClick={() => setShowBinModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #E5E7EB', backgroundColor: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
