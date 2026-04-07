'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSocket } from '@/contexts/SocketContext';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import StripePayment from '@/components/StripePayment';

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
  estimated_price?: string;
  po_number?: string;
  additional_images?: string[] | string;
  attachment_url?: string;
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);

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

  const handleRepeatOrder = () => {
    if (!request) return;
    router.push(`/mobile/customer/order?repeatRequestId=${request.request_id}`);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    showToast('Payment successful!', 'success');
    fetchData();
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

  const getImages = () => {
    if (!request) return [];
    const images: string[] = [];
    if (request.attachment_url) images.push(request.attachment_url);
    
    if (request.additional_images) {
      if (Array.isArray(request.additional_images)) {
        images.push(...request.additional_images);
      } else {
        try {
          const parsed = JSON.parse(request.additional_images);
          if (Array.isArray(parsed)) images.push(...parsed);
        } catch (e) {
          // not JSON
        }
      }
    }
    return images;
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

  const allImages = getImages();
  const needsPayment = request.status !== 'pending' && request.payment_status === 'pending';

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      padding: '1rem',
      maxWidth: '500px',
      margin: '0 auto',
      paddingBottom: '2rem'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Order Details</h2>
          <button
            onClick={handleRepeatOrder}
            style={{
              padding: '0.4rem 0.8rem',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Repeat Order
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Order ID</div>
              <div style={{ fontWeight: 500 }}>{request.request_id}</div>
            </div>
            {request.po_number && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>PO Number</div>
                <div style={{ fontWeight: 500 }}>{request.po_number}</div>
              </div>
            )}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Payment Status</div>
              <div style={{ fontWeight: 500, textTransform: 'capitalize', color: request.payment_status === 'paid' ? '#10B981' : '#F59E0B' }}>
                {request.payment_status === 'paid' ? '✓ Paid' : request.payment_status}
              </div>
            </div>
            {request.estimated_price && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Total Amount</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981' }}>
                  ${parseFloat(request.estimated_price).toFixed(2)}
                </div>
              </div>
            )}
          </div>
          
          {needsPayment && (
            <button
              onClick={() => setShowPayment(true)}
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '1rem',
                backgroundColor: '#10B981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 6px rgba(16, 185, 129, 0.2)'
              }}
            >
              Pay Now
            </button>
          )}
        </div>
      </div>

      {allImages.length > 0 && (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '1.5rem',
          marginBottom: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Order Photos</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {allImages.map((img, idx) => (
              <div 
                key={idx} 
                onClick={() => setSelectedImage(img)}
                style={{ 
                  aspectRatio: '1/1', 
                  borderRadius: '8px', 
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '1px solid #E5E7EB'
                }}
              >
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${img}`}
                  alt={`Order photo ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

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

      {selectedImage && (
        <div 
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '2rem'
          }}
        >
          <img 
            src={`${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'}${selectedImage}`}
            alt="Full size"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
          />
        </div>
      )}

      {showPayment && request && (
        <StripePayment
          requestId={request.id}
          amount={Math.round(parseFloat(request.estimated_price || '0') * 100)}
          onSuccess={handlePaymentSuccess}
          onCancel={() => setShowPayment(false)}
        />
      )}
    </div>
  );
}
