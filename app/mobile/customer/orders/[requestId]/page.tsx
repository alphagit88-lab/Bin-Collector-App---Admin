'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useSocket } from '@/contexts/SocketContext';
import { api } from '@/lib/api';

interface Quote {
  id: number;
  quote_id: string;
  supplier_name: string;
  supplier_phone: string;
  supplier_type: string;
  total_price: string;
  additional_charges: string;
  notes: string;
  status: string;
  created_at: string;
}

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

export default function OrderDetailPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { socket } = useSocket();
  const router = useRouter();
  const params = useParams();
  const requestId = params.requestId as string;

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user?.role !== 'customer') {
      router.push('/dashboard');
      return;
    }
    fetchData();

    if (socket) {
      socket.on('new_quote', (data) => {
        if (data.request.request_id === requestId) {
          showToast('New quote received!', 'success');
          fetchQuotes();
        }
      });

      return () => {
        socket.off('new_quote');
      };
    }
  }, [user, router, requestId, socket]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestRes, quotesRes] = await Promise.all([
        api.get<{ requests: ServiceRequest[] }>('/bookings/my-requests'),
        api.get<{ quotes: Quote[] }>(`/quotes/request/${requestId}`),
      ]);

      if (requestRes.success && requestRes.data) {
        const found = requestRes.data.requests.find(r => r.request_id === requestId);
        setRequest(found || null);
      }

      if (quotesRes.success && quotesRes.data) {
        setQuotes(quotesRes.data.quotes);
      }
    } catch (error) {
      showToast('Failed to load order details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotes = async () => {
    const response = await api.get<{ quotes: Quote[] }>(`/quotes/request/${requestId}`);
    if (response.success && response.data) {
      setQuotes(response.data.quotes);
    }
  };

  const handleAcceptQuote = async (quoteId: number) => {
    if (!confirm('Accept this quote and proceed to payment?')) return;

    setProcessing(true);
    try {
      const response = await api.post(`/quotes/${quoteId}/accept`);
      if (response.success) {
        showToast('Quote accepted! Processing payment...', 'success');
        // Payment is handled automatically when quote is accepted
        setTimeout(() => {
          router.push('/mobile/customer/orders');
        }, 1500);
      } else {
        showToast(response.message || 'Failed to accept quote', 'error');
      }
    } catch (error) {
      showToast('Failed to accept quote', 'error');
    } finally {
      setProcessing(false);
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

  const totalPrice = (price: string, charges: string) => {
    return (parseFloat(price) + parseFloat(charges || '0')).toFixed(2);
  };

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
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Bin Type</div>
            <div style={{ fontWeight: 500 }}>{request.bin_type_name} - {request.bin_size}</div>
          </div>
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
            <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{request.status.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      {quotes.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Quotes Received</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {quotes.map((quote) => (
              <div
                key={quote.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '1rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{quote.supplier_name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>{quote.supplier_phone}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                      {quote.supplier_type === 'commercial' ? 'Commercial' : 
                       quote.supplier_type === 'residential' ? 'Residential' : 
                       'Commercial/Residential'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981' }}>
                      ${totalPrice(quote.total_price, quote.additional_charges)}
                    </div>
                    {quote.additional_charges && parseFloat(quote.additional_charges) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        +${quote.additional_charges} charges
                      </div>
                    )}
                  </div>
                </div>
                {quote.notes && (
                  <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.75rem', padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                    {quote.notes}
                  </div>
                )}
                {quote.status === 'pending' && request.status === 'quoted' && (
                  <button
                    onClick={() => handleAcceptQuote(quote.id)}
                    disabled={processing}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      backgroundColor: '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 600,
                      cursor: processing ? 'not-allowed' : 'pointer',
                      opacity: processing ? 0.6 : 1
                    }}
                  >
                    {processing ? 'Processing...' : 'Accept & Pay'}
                  </button>
                )}
                {quote.status === 'accepted' && (
                  <div style={{ padding: '0.75rem', backgroundColor: '#10B98120', borderRadius: '8px', textAlign: 'center', color: '#10B981', fontWeight: 500 }}>
                    Accepted
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {quotes.length === 0 && request.status === 'pending' && (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '12px', 
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Waiting for Quotes</div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            Suppliers are reviewing your request. You'll receive quotes soon.
          </div>
        </div>
      )}
    </div>
  );
}
