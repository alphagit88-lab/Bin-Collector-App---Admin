'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface OrderItem {
  id: number;
  bin_type_name: string;
  bin_size: string;
  bin_code?: string;
  status: string;
}

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
  const searchParams = useSearchParams();
  const invoiceIdParam = searchParams.get('invoice_id');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('all');

  useEffect(() => {
    if (invoiceIdParam) {
      fetchInvoiceByInvoiceId(invoiceIdParam);
    } else {
      fetchInvoices();
    }
  }, [filterPaymentStatus, filterPaymentMethod, invoiceIdParam]);

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
        setSelectedInvoice(null);
      } else {
        showToast('Failed to fetch invoices', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceByInvoiceId = async (invoiceId: string) => {
    setLoading(true);
    try {
      const response = await api.get<{ invoice: Invoice; orderItems: OrderItem[] }>(`/invoices/by-invoice/${invoiceId}`);
      if (response.success && response.data) {
        setSelectedInvoice(response.data.invoice);
        setOrderItems(response.data.orderItems || []);
        setInvoices([]);
      } else {
        showToast('Invoice not found', 'error');
        setSelectedInvoice(null);
        setOrderItems([]);
        fetchInvoices();
      }
    } catch (error) {
      showToast('Failed to fetch invoice', 'error');
      setSelectedInvoice(null);
      setOrderItems([]);
      fetchInvoices();
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

  // Show single invoice view if invoice_id is in URL
  if (selectedInvoice) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: '#f5f5f5' }}>
        <div className="max-w-4xl mx-auto">
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={() => {
                setSelectedInvoice(null);
                setOrderItems([]);
                window.history.pushState({}, '', '/dashboard/invoices');
                fetchInvoices();
              }}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: '#374151',
                fontWeight: 500
              }}
            >
              ← Back to Invoices
            </button>
          </div>

          {/* Professional Invoice */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            padding: '3rem', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {/* Invoice Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '2px solid #E5E7EB' }}>
              <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>INVOICE</h1>
                <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Invoice #{selectedInvoice.invoice_id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Date</div>
                <div style={{ fontWeight: 600, color: '#111827' }}>{formatDate(selectedInvoice.invoice_date)}</div>
                {selectedInvoice.paid_at && (
                  <>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '1rem', marginBottom: '0.25rem' }}>Paid Date</div>
                    <div style={{ fontWeight: 600, color: '#10B981' }}>{formatDate(selectedInvoice.paid_at)}</div>
                  </>
                )}
              </div>
            </div>

            {/* Bill To / From */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem', marginBottom: '3rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  Bill To
                </div>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111827', marginBottom: '0.5rem' }}>
                  {selectedInvoice.customer_name}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: '1.6' }}>
                  {selectedInvoice.customer_phone}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                  From
                </div>
                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111827', marginBottom: '0.5rem' }}>
                  {selectedInvoice.supplier_name}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: '1.6' }}>
                  {selectedInvoice.supplier_phone}
                </div>
              </div>
            </div>

            {/* Order Items Table */}
            <div style={{ marginBottom: '2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th style={{ textAlign: 'left', padding: '1rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Description
                    </th>
                    <th style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Quantity
                    </th>
                    <th style={{ textAlign: 'right', padding: '1rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Unit Price
                    </th>
                    <th style={{ textAlign: 'right', padding: '1rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.length > 0 ? (
                    orderItems.map((item, index) => (
                      <tr key={item.id || index} style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <td style={{ padding: '1rem 0', fontSize: '0.875rem', color: '#111827' }}>
                          <div style={{ fontWeight: 500 }}>{item.bin_type_name} - {item.bin_size}</div>
                          {item.bin_code && (
                            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                              Bin Code: {item.bin_code}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.875rem', color: '#111827' }}>1</td>
                        <td style={{ textAlign: 'right', padding: '1rem 0', fontSize: '0.875rem', color: '#111827' }}>
                          -
                        </td>
                        <td style={{ textAlign: 'right', padding: '1rem 0', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                          -
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '2rem 0', textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
                        No items found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Subtotal</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                    {formatCurrency(selectedInvoice.total_amount)}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Tax</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>$0.00</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', marginTop: '0.5rem', borderTop: '2px solid #111827' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Total</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981' }}>
                    {formatCurrency(selectedInvoice.total_amount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div style={{ paddingTop: '2rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Payment Method
                </div>
                <span className={selectedInvoice.payment_method === 'online' ? 'badge badge-customer' : 'badge badge-supplier'}>
                  {selectedInvoice.payment_method === 'online' ? 'Online Payment' : 'Cash on Delivery'}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  Payment Status
                </div>
                <span className={getPaymentStatusBadgeClass(selectedInvoice.payment_status)}>
                  {selectedInvoice.payment_status.charAt(0).toUpperCase() + selectedInvoice.payment_status.slice(1)}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #E5E7EB', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                Request ID: {selectedInvoice.request_id}
              </div>
            </div>
          </div>
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
                      <a
                        href={`/dashboard/invoices?invoice_id=${invoice.invoice_id}`}
                        style={{ 
                          fontFamily: 'monospace', 
                          fontSize: '0.875rem',
                          color: '#3B82F6',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {invoice.invoice_id}
                      </a>
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
