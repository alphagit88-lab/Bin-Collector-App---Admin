'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Payout {
  id: number;
  payout_id: string;
  supplier_id: number;
  wallet_id: number;
  amount: string;
  status: string;
  payment_method: string;
  bank_details: string | null;
  admin_notes: string | null;
  supplier_name: string;
  supplier_phone: string;
  supplier_email: string;
  created_at: string;
  updated_at: string;
}

export default function PayoutsPage() {
  const { showToast } = useToast();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPayouts();
  }, [filterStatus]);

  const fetchPayouts = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const response = await api.get<{ payouts: Payout[] }>(`/wallet/admin/payouts${params}`);
      if (response.success && response.data) {
        setPayouts(response.data.payouts);
      } else {
        showToast('Failed to fetch payouts', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch payouts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (payoutId: number, status: 'approved' | 'rejected') => {
    setProcessing(true);
    try {
      const response = await api.put<{ payout: Payout }>(`/wallet/admin/payouts/${payoutId}/status`, {
        status,
        admin_notes: adminNotes || null,
      });
      if (response.success) {
        showToast(`Payout ${status} successfully`, 'success');
        setSelectedPayout(null);
        setAdminNotes('');
        fetchPayouts();
      } else {
        showToast(response.message || 'Failed to update payout', 'error');
      }
    } catch (error) {
      showToast('Failed to update payout', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge badge-supplier';
      case 'approved':
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

  const parseBankDetails = (bankDetails: string | null) => {
    if (!bankDetails) return null;
    try {
      return JSON.parse(bankDetails);
    } catch {
      return null;
    }
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Payout Requests</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Review and manage supplier payout requests</p>
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
            className={`btn btn-sm cursor-pointer ${filterStatus === 'approved' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('approved')}
          >
            Approved
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'rejected' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('rejected')}
          >
            Rejected
          </button>
        </div>

        {/* Payouts Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Payout ID</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No payouts found
                  </td>
                </tr>
              ) : (
                payouts.map((payout) => {
                  const bankDetails = parseBankDetails(payout.bank_details);
                  return (
                    <tr key={payout.id}>
                      <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {payout.payout_id}
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500 }}>{payout.supplier_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {payout.supplier_phone}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(payout.amount)}</td>
                      <td>
                        <div style={{ textTransform: 'capitalize' }}>{payout.payment_method.replace('_', ' ')}</div>
                        {bankDetails && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {bankDetails.account_number ? `****${String(bankDetails.account_number).slice(-4)}` : 'N/A'}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`${getStatusBadgeClass(payout.status)} capitalize`}>{payout.status}</span>
                      </td>
                      <td>{new Date(payout.created_at).toLocaleDateString()}</td>
                      <td>
                        {payout.status === 'pending' && (
                          <button
                            onClick={() => setSelectedPayout(payout)}
                            className="btn btn-primary btn-sm cursor-pointer"
                          >
                            Review
                          </button>
                        )}
                        {payout.status !== 'pending' && payout.admin_notes && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {payout.admin_notes}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Review Modal */}
        {selectedPayout && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }} onClick={() => {
            setSelectedPayout(null);
            setAdminNotes('');
          }}>
            <div className="card" style={{
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>Review Payout</h2>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Payout ID: </span>
                  <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>{selectedPayout.payout_id}</span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Supplier: </span>
                  <span style={{ fontWeight: 500 }}>{selectedPayout.supplier_name}</span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Amount: </span>
                  <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>{formatCurrency(selectedPayout.amount)}</span>
                </div>
                {parseBankDetails(selectedPayout.bank_details) && (
                  <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'var(--color-bg-secondary)' }}>
                    <div style={{ fontWeight: 500, marginBottom: '0.5rem' }}>Bank Details:</div>
                    {Object.entries(parseBankDetails(selectedPayout.bank_details) || {}).map(([key, value]) => (
                      <div key={key} style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        <span style={{ textTransform: 'capitalize' }}>{key.replace('_', ' ')}: </span>
                        <span>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Admin Notes (optional)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="form-control"
                  rows={3}
                  placeholder="Add notes about this payout..."
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  onClick={() => handleUpdateStatus(selectedPayout.id, 'approved')}
                  disabled={processing}
                  className="btn btn-primary cursor-pointer flex-1"
                >
                  {processing ? 'Processing...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedPayout.id, 'rejected')}
                  disabled={processing}
                  className="btn btn-danger cursor-pointer flex-1"
                >
                  {processing ? 'Processing...' : 'Reject'}
                </button>
                <button
                  onClick={() => {
                    setSelectedPayout(null);
                    setAdminNotes('');
                  }}
                  className="btn btn-outline cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
