'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api, API_BASE_URL } from '@/lib/api';

interface CommercialOrder {
  id: number;
  request_id: string;
  customer_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_category: 'commercial' | 'residential';
  bin_type_name: string;
  bin_size: string;
  location: string;
  total_price?: string;
  estimated_price?: string;
  created_at: string;
}

interface CustomerInvoice {
  id: number;
  invoice_id: string;
  customer_id: number;
  service_category: 'commercial' | 'residential';
  month: number;
  year: number;
  total_amount: string;
  gst_amount: string;
  gst_rate: string;
  payment_status: 'paid' | 'unpaid' | 'refunded';
  payment_method?: string;
  paid_at?: string;
  pdf_url?: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
}

export default function CustomerInvoicesPage() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<CommercialOrder[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [pdfModalVisible, setPdfModalVisible] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'orders' | 'invoices'>('orders');

  useEffect(() => {
    fetchCommercialOrders();
    fetchCustomerInvoices();
  }, []);

  const fetchCommercialOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await api.get<{ orders: CommercialOrder[] }>('/customer-invoices/commercial-orders');
      if (response.success && response.data) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      showToast('Failed to fetch commercial orders', 'error');
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchCustomerInvoices = async () => {
    setLoadingInvoices(true);
    try {
      const response = await api.get<{ invoices: CustomerInvoice[] }>('/customer-invoices');
      if (response.success && response.data) {
        setInvoices(response.data.invoices);
      }
    } catch (error) {
      showToast('Failed to fetch customer invoices', 'error');
    } finally {
      setLoadingInvoices(false);
    }
  };

  const generateInvoice = async (orderId: number) => {
    setGeneratingInvoice(true);
    try {
      const response = await api.post<{ invoice: CustomerInvoice, pdf_url: string }>('/customer-invoices/generate-from-order', {
        service_request_id: orderId,
      });
      if (response.success && response.data) {
        showToast('Invoice generated successfully', 'success');
        fetchCustomerInvoices();
        setCurrentPdfUrl(response.data.pdf_url);
        setPdfModalVisible(true);
        setActiveTab('invoices');
      }
    } catch (error) {
      showToast('Failed to generate invoice', 'error');
    } finally {
      setGeneratingInvoice(false);
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

  const getMonthName = (month: number) => {
    return new Date(0, month - 1, 1).toLocaleString('default', { month: 'long' });
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Customer Invoices</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Generate and manage customer invoices for commercial orders</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('orders')}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: activeTab === 'orders' ? '#10B981' : 'white',
              color: activeTab === 'orders' ? 'white' : 'var(--color-text-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Commercial Orders
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              backgroundColor: activeTab === 'invoices' ? '#10B981' : 'white',
              color: activeTab === 'invoices' ? 'white' : 'var(--color-text-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Invoices
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Customer</th>
                  <th>Bin Type</th>
                  <th>Bin Size</th>
                  <th>Location</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Loading orders...</p>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No Commercial Orders Found</div>
                      <div style={{ fontSize: '0.875rem' }}>Commercial orders will appear here</div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{order.request_id}</span>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{order.customer_name}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{order.customer_email}</div>
                        </div>
                      </td>
                      <td>{order.bin_type_name || 'N/A'}</td>
                      <td>{order.bin_size || 'N/A'}</td>
                      <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.location}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#10B981' }}>
                          {formatCurrency(order.total_price || order.estimated_price || 0)}
                        </span>
                      </td>
                      <td>{formatDate(order.created_at)}</td>
                      <td>
                        <button
                          onClick={() => generateInvoice(order.id)}
                          disabled={generatingInvoice}
                          style={{
                            padding: '0.375rem 0.875rem',
                            borderRadius: '6px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            border: 'none',
                            cursor: generatingInvoice ? 'not-allowed' : 'pointer',
                            opacity: generatingInvoice ? 0.6 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice ID</th>
                  <th>Customer</th>
                  <th>Service Category</th>
                  <th>Month/Year</th>
                  <th>Subtotal</th>
                  <th>GST</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>PDF</th>
                  <th>Created Date</th>
                </tr>
              </thead>
              <tbody>
                {loadingInvoices ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3rem' }}>
                      <div className="w-8 h-8 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Loading invoices...</p>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No Customer Invoices Found</div>
                      <div style={{ fontSize: '0.875rem' }}>Generate invoices from commercial orders</div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{invoice.invoice_id}</span>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{invoice.customer_name}</div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{invoice.customer_email}</div>
                        </div>
                      </td>
                      <td>
                        <span style={{ textTransform: 'capitalize' }}>{invoice.service_category}</span>
                      </td>
                      <td>
                        {getMonthName(invoice.month)} {invoice.year}
                      </td>
                      <td>
                        {formatCurrency(parseFloat(invoice.total_amount) - parseFloat(invoice.gst_amount))}
                      </td>
                      <td>
                        {formatCurrency(invoice.gst_amount)} ({parseFloat(invoice.gst_rate).toFixed(2)}%)
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#10B981' }}>{formatCurrency(invoice.total_amount)}</span>
                      </td>
                      <td>
                        <span className={getPaymentStatusBadgeClass(invoice.payment_status)}>
                          {invoice.payment_status.charAt(0).toUpperCase() + invoice.payment_status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {invoice.pdf_url ? (
                          <button
                            onClick={() => {
                              if (invoice.pdf_url) {
                                setCurrentPdfUrl(invoice.pdf_url);
                                setPdfModalVisible(true);
                              }
                            }}
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              backgroundColor: '#3B82F6',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              border: 'none',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            View PDF
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                        )}
                      </td>
                      <td>
                        {formatDate(invoice.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PDF Modal */}
      {pdfModalVisible && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
          onClick={() => setPdfModalVisible(false)}
        >
          <div
            style={{
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '1000px',
              height: '80vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPdfModalVisible(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#F3F4F6',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10,
              }}
            >
              ✕
            </button>
            <iframe
              src={`${API_BASE_URL}${currentPdfUrl}`}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '12px',
              }}
              title="Customer Invoice PDF"
            />
          </div>
        </div>
      )}
    </div>
  );
}
