'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface SupplierWallet {
  id: number;
  supplier_id: number;
  balance: string;
  pending_balance: string;
  total_earned: string;
  supplier_name: string;
  supplier_phone: string;
  supplier_email: string;
  created_at: string;
  updated_at: string;
}

export default function WalletsPage() {
  const { showToast } = useToast();
  const [wallets, setWallets] = useState<SupplierWallet[]>([]);
  const [stats, setStats] = useState<{ total_commission: string | number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ wallets: SupplierWallet[], stats: any }>('/wallet/admin/wallets');
      if (response.success && response.data) {
        setWallets(response.data.wallets);
        setStats(response.data.stats);
      } else {
        showToast('Failed to fetch wallets', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch wallets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toFixed(2)}`;
  };

  // Calculate totals
  const totalBalance = wallets.reduce((sum, w) => sum + parseFloat(w.balance), 0);
  const totalPending = wallets.reduce((sum, w) => sum + parseFloat(w.pending_balance), 0);
  const totalEarned = wallets.reduce((sum, w) => sum + parseFloat(w.total_earned), 0);

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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Wallets</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>View all wallet balances and earnings</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="dashboard-card rounded-lg p-6">
            <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Total Available Balance</p>
            <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(totalBalance)}</p>
          </div>
          <div className="dashboard-card rounded-lg p-6">
            <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Total Pending Balance</p>
            <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(totalPending)}</p>
          </div>
          <div className="dashboard-card rounded-lg p-6">
            <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Total Earned</p>
            <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(totalEarned)}</p>
          </div>
          <div className="dashboard-card rounded-lg p-6">
            <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Total Platform Commission</p>
            <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(stats?.total_commission || 0)}</p>
          </div>
        </div>

        {/* Wallets Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Supplier</th>
                <th>Contact</th>
                <th>Available Balance</th>
                <th>Pending Balance</th>
                <th>Total Earned</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {wallets.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No wallets found
                  </td>
                </tr>
              ) : (
                wallets.map((wallet) => (
                  <tr key={wallet.id}>
                    <td style={{ fontWeight: 500 }}>{wallet.supplier_name}</td>
                    <td>
                      <div>
                        <div>{wallet.supplier_phone}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {wallet.supplier_email}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#10B981' }}>{formatCurrency(wallet.balance)}</td>
                    <td style={{ fontWeight: 500 }}>{formatCurrency(wallet.pending_balance)}</td>
                    <td style={{ fontWeight: 500 }}>{formatCurrency(wallet.total_earned)}</td>
                    <td>{new Date(wallet.updated_at).toLocaleDateString()}</td>
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
