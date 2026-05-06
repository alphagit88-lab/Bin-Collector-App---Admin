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

export default function SupplierEarningsPage() {
  const { showToast } = useToast();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      showToast('Failed to fetch earnings data', 'error');
    } finally {
      setLoading(false);
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Earnings & Payouts</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Track your earnings, available balance, and payout history</p>
        </div>

        {/* Wallet Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="dashboard-card rounded-lg p-6" style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)', color: 'white' }}>
            <p className="text-sm mb-3 font-light text-white/80">Available Balance</p>
            <p className="text-5xl font-bold">${wallet ? parseFloat(wallet.balance).toFixed(2) : '0.00'}</p>
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
                        <span className={`${getStatusBadgeClass(payout.status)} capitalize`}>{payout.status}</span>
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
    </div>
  );
}
