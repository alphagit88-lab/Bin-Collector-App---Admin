'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Wallet {
  balance: string;
  pending_balance: string;
  total_earned: string;
}

interface Payout {
  id: number;
  payout_id: string;
  amount: string;
  status: string;
  payment_method: string;
  created_at: string;
}

interface PendingJob {
  wallet_transaction_id: number;
  amount: string;
  description: string | null;
  created_at: string;
  service_request_code: string | null;
}

export default function SupplierEarningsPage() {
  const { showToast } = useToast();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    setLoading(true);
    try {
      const walletRes = await api.get<{ wallet: Wallet }>('/wallet');
      if (walletRes.success && walletRes.data) {
        setWallet(walletRes.data.wallet);
      }

      const payoutsRes = await api.get<{ payouts: Payout[] }>('/wallet/payouts');
      if (payoutsRes.success && payoutsRes.data) {
        setPayouts(payoutsRes.data.payouts);
      }

      const jobsRes = await api.get<{ pending_jobs: PendingJob[] }>('/wallet/pending-jobs');
      if (jobsRes.success && jobsRes.data) {
        setPendingJobs(jobsRes.data.pending_jobs || []);
      }
    } catch (error) {
      showToast('Failed to fetch earnings data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openPayoutModal = async () => {
    setSelectedIds(new Set());
    setPayoutModalOpen(true);
    try {
      const jobsRes = await api.get<{ pending_jobs: PendingJob[] }>('/wallet/pending-jobs');
      if (jobsRes.success && jobsRes.data) {
        setPendingJobs(jobsRes.data.pending_jobs || []);
      }
    } catch (_) {}
  };

  const toggleJob = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedTotal = pendingJobs
    .filter(j => selectedIds.has(j.wallet_transaction_id))
    .reduce((sum, j) => sum + parseFloat(j.amount), 0);

  const handleRequestPayout = async () => {
    if (selectedIds.size === 0) {
      showToast('Select at least one job to include in the payout', 'error');
      return;
    }
    setRequesting(true);
    try {
      const response = await api.post('/wallet/payout', {
        wallet_transaction_ids: Array.from(selectedIds),
        payment_method: 'bank_transfer',
      });
      if (response.success) {
        showToast('Payout request submitted successfully. An invoice has been generated.', 'success');
        setPayoutModalOpen(false);
        setSelectedIds(new Set());
        fetchEarningsData();
      } else {
        showToast(response.message || 'Failed to request payout', 'error');
      }
    } catch {
      showToast('An error occurred while requesting payout', 'error');
    } finally {
      setRequesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved' || status === 'completed') return '#10B981';
    if (status === 'pending' || status === 'processing') return '#F59E0B';
    return '#EF4444';
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Earnings &amp; Payouts</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Track your earnings, available balance, and payout history</p>
        </div>

        {/* Wallet Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Available Balance card with Request Payout button */}
          <div className="dashboard-card rounded-lg p-6" style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)', color: 'white' }}>
            <p className="text-sm mb-3 font-light" style={{ color: 'rgba(255,255,255,0.8)' }}>Available Balance</p>
            <p className="text-5xl font-bold">${wallet ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</p>
            <button
              onClick={openPayoutModal}
              disabled={pendingJobs.length === 0}
              style={{
                marginTop: '1.25rem',
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.35)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: pendingJobs.length === 0 ? 'not-allowed' : 'pointer',
                opacity: pendingJobs.length === 0 ? 0.6 : 1,
                transition: 'background 0.2s',
              }}
            >
              Request Payout
            </button>
          </div>
          <div className="dashboard-card rounded-lg p-6">
            <p className="text-sm mb-3 font-light text-gray-500">Pending Clearance</p>
            <p className="text-4xl font-bold text-gray-800">${wallet ? parseFloat(wallet.pending_balance).toFixed(2) : '0.00'}</p>
          </div>
          <div className="dashboard-card rounded-lg p-6">
            <p className="text-sm mb-3 font-light text-gray-500">Total Earned</p>
            <p className="text-4xl font-bold text-gray-800">${wallet ? parseFloat(wallet.total_earned).toFixed(2) : '0.00'}</p>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="dashboard-card rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Payout History</h2>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Payout ID</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      No payout history found
                    </td>
                  </tr>
                ) : (
                  payouts.map((payout) => (
                    <tr key={payout.id}>
                      <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                        {payout.payout_id}
                      </td>
                      <td style={{ fontWeight: 600 }}>${parseFloat(payout.amount).toFixed(2)}</td>
                      <td>
                        <div style={{ textTransform: 'capitalize' }}>{payout.payment_method.replace('_', ' ')}</div>
                      </td>
                      <td>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          background: `${getStatusColor(payout.status)}20`,
                          color: getStatusColor(payout.status),
                          textTransform: 'capitalize',
                        }}>
                          {payout.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>{new Date(payout.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payout Request Modal */}
      {payoutModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '2rem',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.5rem', textAlign: 'center', color: '#242424' }}>Request Payout</h2>
            <p style={{ color: '#666', fontSize: '0.875rem', textAlign: 'center', marginBottom: '1.25rem' }}>Select completed jobs to include in this payout</p>

            {pendingJobs.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>No pending job earnings available for payout.</p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1, marginBottom: '1rem' }}>
                {pendingJobs.map((job) => {
                  const isSelected = selectedIds.has(job.wallet_transaction_id);
                  return (
                    <div
                      key={job.wallet_transaction_id}
                      onClick={() => toggleJob(job.wallet_transaction_id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        marginBottom: '0.5rem',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(41, 181, 84, 0.1)' : '#F5F5F5',
                        border: isSelected ? '1.5px solid #29B554' : '1.5px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                          border: `2px solid ${isSelected ? '#29B554' : '#CCC'}`,
                          background: isSelected ? '#29B554' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSelected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>✓</span>}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#242424', margin: 0 }}>
                            {job.service_request_code || `Job #${job.wallet_transaction_id}`}
                          </p>
                          <p style={{ fontSize: '0.78rem', color: '#888', margin: 0, marginTop: '2px' }}>
                            {job.description || 'Earning'} · {new Date(job.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <p style={{ fontWeight: 700, fontSize: '1rem', color: '#242424', margin: 0 }}>
                        ${parseFloat(job.amount).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedIds.size > 0 && (
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#242424', marginBottom: '0.5rem' }}>
                Total: ${selectedTotal.toFixed(2)}
              </p>
            )}
            <p style={{ fontSize: '0.78rem', color: '#888', marginBottom: '1.25rem' }}>
              An invoice listing these jobs will be generated upon submission.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => setPayoutModalOpen(false)}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: '12px',
                  border: 'none', background: '#F5F5F5', color: '#666',
                  fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayout}
                disabled={requesting || selectedIds.size === 0}
                style={{
                  flex: 1, padding: '0.85rem', borderRadius: '12px',
                  border: 'none', background: '#29B554', color: '#fff',
                  fontWeight: 700, fontSize: '0.95rem',
                  cursor: requesting || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                  opacity: requesting || selectedIds.size === 0 ? 0.7 : 1,
                }}
              >
                {requesting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
