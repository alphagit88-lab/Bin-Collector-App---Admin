'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Invoice {
  id: number;
  invoice_number: string;
  amount: string;
  status: 'paid' | 'pending' | 'void';
  created_at: string;
  service_request_number: string;
}

export default function CustomerBillingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'customer') {
      router.push('/dashboard');
      return;
    }
    
    if (user?.canViewBilling) {
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [user, router]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ invoices: Invoice[] }>('/billing/invoices');
      if (response.success && response.data) {
        setInvoices(response.data.invoices);
      }
    } catch (error) {
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user?.canViewBilling) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Access Restricted</h1>
        <p style={{ color: '#6B7280', maxWidth: '300px', lineHeight: '1.5' }}>
          Your billing section is currently disabled. Please contact the administrator to enable invoice viewing for your account.
        </p>
        <button 
          onClick={() => router.back()}
          style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', backgroundColor: '#10B981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '1rem', maxWidth: '500px', margin: '0 auto', paddingBottom: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', padding: '0 0.5rem' }}>Billing & Invoices</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', backgroundColor: 'white', borderRadius: '12px', color: '#6B7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
            <p>No invoices found to display.</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <div key={invoice.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>Invoice # {invoice.invoice_number}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{new Date(invoice.created_at).toLocaleDateString()}</div>
                </div>
                <div style={{ 
                  padding: '4px 10px', 
                  borderRadius: '12px', 
                  fontSize: '0.75rem', 
                  fontWeight: 600, 
                  backgroundColor: invoice.status === 'paid' ? '#D1FAE5' : '#FEF3C7',
                  color: invoice.status === 'paid' ? '#059669' : '#D97706',
                  textTransform: 'uppercase'
                }}>
                  {invoice.status}
                </div>
              </div>
              <div style={{ height: '1px', backgroundColor: '#F3F4F6', margin: '0.75rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Order Ref</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{invoice.service_request_number}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Amount</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981' }}>{formatCurrency(invoice.amount)}</div>
                </div>
              </div>
              <button 
                style={{ 
                  width: '100%', 
                  marginTop: '1rem', 
                  padding: '0.6rem', 
                  backgroundColor: '#F3F4F6', 
                  color: '#374151', 
                  border: '1px solid #E5E7EB', 
                  borderRadius: '6px', 
                  fontSize: '0.875rem', 
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
                onClick={() => showToast('PDF download will be available in the next update!', 'success')}
              >
                Download PDF
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
