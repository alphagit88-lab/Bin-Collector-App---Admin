'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
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
  customer_name: string;
  customer_phone: string;
}

export default function SubmitQuotePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const params = useParams();
  const requestId = parseInt(params.requestId as string);

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    total_price: '',
    additional_charges: '',
    notes: '',
  });

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    fetchRequest();
  }, [user, router, requestId]);

  const fetchRequest = async () => {
    setLoading(true);
    const response = await api.get<{ request: ServiceRequest }>(`/bookings/${requestId}`);
    if (response.success && response.data) {
      setRequest(response.data.request);
    } else {
      showToast('Request not found', 'error');
      router.push('/mobile/supplier/notifications');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await api.post('/quotes', {
        service_request_id: requestId,
        total_price: parseFloat(formData.total_price),
        additional_charges: parseFloat(formData.additional_charges || '0'),
        notes: formData.notes || undefined,
      });

      if (response.success) {
        showToast('Quote submitted successfully!', 'success');
        router.push('/mobile/supplier/jobs');
      } else {
        showToast(response.message || 'Failed to submit quote', 'error');
      }
    } catch (error) {
      showToast('Failed to submit quote', 'error');
    } finally {
      setSubmitting(false);
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
    return null;
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Submit Quote</h2>
        
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{request.bin_type_name} - {request.bin_size}</div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>
            👤 {request.customer_name} - {request.customer_phone}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>
            📍 {request.location}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
            📅 {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Total Price ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.total_price}
              onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Additional Charges ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.additional_charges}
              onChange={(e) => setFormData({ ...formData, additional_charges: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ 
            padding: '1rem', 
            backgroundColor: '#f0fdf4', 
            borderRadius: '8px',
            border: '1px solid #10B981'
          }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Total Amount</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981' }}>
              ${(parseFloat(formData.total_price || '0') + parseFloat(formData.additional_charges || '0')).toFixed(2)}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Quote'}
          </button>
        </form>
      </div>
    </div>
  );
}
