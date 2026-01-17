'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Invoice {
  id: number;
  invoice_id: string;
  service_request_id: number;
  customer_id: number;
  supplier_id: number;
  total_amount: string;
  payment_method: 'cash' | 'online';
  payment_status: 'paid' | 'unpaid' | 'refunded';
  invoice_date: string;
  paid_at: string | null;
  created_at: string;
  request_id: string;
  customer_name: string;
  customer_phone: string;
  supplier_name: string;
  supplier_phone: string;
}

export default function InvoicesPage() {
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');

  useEffect(() => {
    fetchInvoices();
  }, [filterPaymentStatus, filterPaymentMethod]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterPaymentStatus !== 'all') {
        params.append('payment_status', filterPaymentStatus);
      }
      if (filterPaymentMethod !== 'all') {
        params.append('payment_method', filterPaymentMethod);
      }
      const queryString = params.toString();
      const url = `/invoices${queryString ? `?${queryString}` : ''}`;
      const response = await api.get<{ invoices: Invoice[] }>(url);
      if (response.success && response.data) {
        setInvoices(response.data.invoices);
      } else {
        showToast('Failed to fetch invoices', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'badge badge-customer';
      case 'unpaid':
        return 'badge badge-supplier';
      case 'refunded':
        return 'badge badge-admin';
      default:
        return 'badge';
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
          <p className="font-light" style={{ color: 'var(--color-text-secondary)' }}>Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Invoices</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>View and manage all invoices</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Payment Status
            </label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Payment Method
            </label>
            <select
              value={filterPaymentMethod}
              onChange={(e) => setFilterPaymentMethod(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'white',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Methods</option>
              <option value="online">Online</option>
              <option value="cash">Cash</option>
            </select>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Request ID</th>
                <th>Customer</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Payment Status</th>
                <th>Invoice Date</th>
                <th>Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No Invoices Found</div>
                    <div style={{ fontSize: '0.875rem' }}>
                      {filterPaymentStatus !== 'all' || filterPaymentMethod !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Invoices will appear here when orders are confirmed'}
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{invoice.invoice_id}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{invoice.request_id}</span>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{invoice.customer_name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{invoice.customer_phone}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{invoice.supplier_name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{invoice.supplier_phone}</div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#10B981' }}>{formatCurrency(invoice.total_amount)}</span>
                    </td>
                    <td>
                      <span className={invoice.payment_method === 'online' ? 'badge badge-customer' : 'badge badge-supplier'}>
                        {invoice.payment_method === 'online' ? 'Online' : 'Cash'}
                      </span>
                    </td>
                    <td>
                      <span className={getPaymentStatusBadgeClass(invoice.payment_status)}>
                        {invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1)}
                      </span>
                    </td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>
                      {invoice.paid_at ? formatDate(invoice.paid_at) : <span style={{ color: 'var(--color-text-secondary)' }}>-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
