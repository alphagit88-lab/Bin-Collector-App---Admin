'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Quote {
  id: number;
  quote_id: string;
  service_request_id: number;
  supplier_id: number;
  total_price: string;
  additional_charges: string;
  notes: string | null;
  status: string;
  supplier_name: string;
  supplier_phone: string;
  supplier_type: string | null;
  request_id: string;
  customer_id: number;
  customer_name: string;
  created_at: string;
}

export default function QuotesPage() {
  const { showToast } = useToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchQuotes();
  }, [filterStatus]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const response = await api.get<{ quotes: Quote[] }>(`/quotes/admin/all${params}`);
      if (response.success && response.data) {
        setQuotes(response.data.quotes);
      } else {
        showToast('Failed to fetch quotes', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch quotes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge badge-supplier';
      case 'accepted':
        return 'badge badge-admin';
      case 'rejected':
        return 'badge badge-supplier';
      default:
        return 'badge';
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
          <p className="font-light" style={{ color: 'var(--color-text-secondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Quotes</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>View and manage all supplier quotes</p>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'pending' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'accepted' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('accepted')}
          >
            Accepted
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'rejected' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('rejected')}
          >
            Rejected
          </button>
        </div>

        {/* Quotes Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Request ID</th>
                <th>Supplier</th>
                <th>Customer</th>
                <th>Price</th>
                <th>Additional Charges</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                    No quotes found
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => {
                  const total = parseFloat(quote.total_price) + parseFloat(quote.additional_charges || '0');
                  return (
                    <tr key={quote.id}>
                      <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {quote.quote_id}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {quote.request_id}
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{quote.supplier_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {quote.supplier_phone}
                          </div>
                          {quote.supplier_type && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {quote.supplier_type}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 500 }}>{quote.customer_name}</td>
                      <td style={{ fontWeight: 500 }}>{formatCurrency(quote.total_price)}</td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>
                        {formatCurrency(quote.additional_charges || '0')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(total)}</td>
                      <td>
                        <span className={`${getStatusBadgeClass(quote.status)} capitalize`}>{quote.status}</span>
                      </td>
                      <td>{new Date(quote.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
