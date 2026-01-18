'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSocket } from '@/contexts/SocketContext';
import { api } from '@/lib/api';

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
}

interface OrderItem {
  id: number;
  bin_type_name: string;
  bin_size: string;
  bin_code?: string;
  status: string;
  physical_bin_status?: string;
}

export default function OrderDetailPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { socket } = useSocket();
  const router = useRouter();
  const params = useParams();
  const requestId = params.requestId as string;

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingReady, setMarkingReady] = useState(false);

  useEffect(() => {
    if (user?.role !== 'customer') {
      router.push('/dashboard');
      return;
    }
    fetchData();

    if (socket) {
      socket.on('request_accepted', (data) => {
        if (data.request?.request_id === requestId) {
          showToast('Order confirmed!', 'success');
          fetchData();
        }
      });

      return () => {
        socket.off('request_accepted');
      };
    }
  }, [user, router, requestId, socket]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ requests: ServiceRequest[] }>('/bookings/my-requests');
      if (response.success && response.data) {
        const found = response.data.requests.find(r => r.request_id === requestId);
        setRequest(found || null);
        
        if (found) {
          // Fetch order items
          const itemsResponse = await api.get<{ orderItems: OrderItem[] }>(`/bookings/${found.id}/order-items`);
          if (itemsResponse.success && itemsResponse.data) {
            setOrderItems(itemsResponse.data.orderItems);
          }
        }
      }
    } catch (error) {
      showToast('Failed to load order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkReadyToPickup = async () => {
    if (!request) return;
    
    setMarkingReady(true);
    try {
      const response = await api.put(`/bookings/${request.id}/ready-to-pickup`);
      if (response.success) {
        showToast('Order marked as ready to pickup', 'success');
        fetchData();
      } else {
        showToast(response.message || 'Failed to mark as ready to pickup', 'error');
      }
    } catch (error) {
      showToast('Failed to mark as ready to pickup', 'error');
    } finally {
      setMarkingReady(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loaded': return '#6366F1';
      case 'delivered': return '#F59E0B';
      case 'ready_to_pickup': return '#EC4899';
      case 'picked_up': return '#14B8A6';
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

  if (!request) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Order not found</div>
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
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Order Details</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Order ID</div>
            <div style={{ fontWeight: 500 }}>{request.request_id}</div>
          </div>
          {orderItems.length > 0 ? (
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>Bins</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {orderItems.map((item, idx) => (
                  <div key={item.id} style={{ 
                    padding: '0.75rem', 
                    backgroundColor: '#F9FAFB', 
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB'
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>
                      {item.bin_type_name} - {item.bin_size}
                    </div>
                    {item.bin_code && (
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                        Bin Code: {item.bin_code}
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: getStatusColor(item.status),
                      fontWeight: 500
                    }}>
                      Status: {item.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Bin Type</div>
              <div style={{ fontWeight: 500 }}>{request.bin_type_name} - {request.bin_size}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Location</div>
            <div style={{ fontWeight: 500 }}>{request.location}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Dates</div>
            <div style={{ fontWeight: 500 }}>
              {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Status</div>
            <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{request.status.replace(/_/g, ' ')}</div>
          </div>
          {request.payment_status && (
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Payment Status</div>
              <div style={{ fontWeight: 500, textTransform: 'capitalize', color: request.payment_status === 'paid' ? '#10B981' : '#F59E0B' }}>
                {request.payment_status === 'paid' ? '✓ Paid' : request.payment_status}
              </div>
            </div>
          )}
        </div>
      </div>

      {request.status === 'pending' && (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Waiting for Supplier</div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Suppliers are reviewing your request. Your order will be confirmed once a supplier accepts it.
          </div>
        </div>
      )}

      {request.status === 'delivered' && (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Bins Delivered</div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Once you've filled the bins, mark them as ready for pickup.
            </div>
          </div>
          <button
            onClick={handleMarkReadyToPickup}
            disabled={markingReady}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: markingReady ? 'not-allowed' : 'pointer',
              opacity: markingReady ? 0.6 : 1
            }}
          >
            {markingReady ? 'Marking...' : 'Mark As Ready To Pickup'}
          </button>
        </div>
      )}
    </div>
  );
}
