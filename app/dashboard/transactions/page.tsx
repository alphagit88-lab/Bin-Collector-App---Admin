'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Transaction {
  id: number;
  transaction_id: string;
  customer_id: number;
  supplier_id: number | null;
  booking_id: string | null;
  amount: string;
  commission_amount: string;
  net_amount: string;
  payment_method: string;
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_type: string;
  description: string | null;
  customer_name: string;
  customer_phone: string;
  supplier_name: string | null;
  supplier_phone: string | null;
  created_at: string;
}

interface TransactionStats {
  total_transactions: string;
  completed_transactions: string;
  pending_transactions: string;
  failed_transactions: string;
  total_revenue: string;
  total_commission: string;
}

export default function TransactionsPage() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchTransactions();
    fetchStats();
  }, [filterStatus]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?payment_status=${filterStatus}` : '';
      const response = await api.get<{ transactions: Transaction[] }>(`/transactions${params}`);
      if (response.success && response.data) {
        setTransactions(response.data.transactions);
      } else {
        showToast('Failed to fetch transactions', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch transactions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get<{ stats: TransactionStats }>('/transactions/stats');
      if (response.success && response.data) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge badge-customer';
      case 'pending':
        return 'badge badge-supplier';
      case 'failed':
        return 'badge badge-admin';
      case 'refunded':
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Transactions</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>View and manage all payment transactions</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="dashboard-card rounded-lg p-6">
              <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Total Transactions</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{stats.total_transactions}</p>
            </div>
            <div className="dashboard-card rounded-lg p-6">
              <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Completed</p>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>{stats.completed_transactions}</p>
            </div>
            <div className="dashboard-card rounded-lg p-6">
              <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Total Revenue</p>
              <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(stats.total_revenue)}</p>
            </div>
            <div className="dashboard-card rounded-lg p-6">
              <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Total Commission</p>
              <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(stats.total_commission)}</p>
            </div>
          </div>
        )}

        {/* Filter */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'completed' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('completed')}
          >
            Completed
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'pending' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'failed' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('failed')}
          >
            Failed
          </button>
        </div>

        {/* Transactions Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Customer</th>
                <th>Supplier</th>
                <th>Amount</th>
                <th>Commission</th>
                <th>Net Amount</th>
                <th>Status</th>
                <th>Payment Method</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                    No transactions found
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {transaction.transaction_id}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{transaction.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {transaction.customer_phone}
                        </div>
                      </div>
                    </td>
                    <td>
                      {transaction.supplier_name ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{transaction.supplier_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {transaction.supplier_phone}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(transaction.amount)}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>
                      {formatCurrency(transaction.commission_amount)}
                    </td>
                    <td style={{ fontWeight: 500 }}>{formatCurrency(transaction.net_amount)}</td>
                    <td>
                      <span className={getStatusBadgeClass(transaction.payment_status)}>
                        {transaction.payment_status.charAt(0).toUpperCase() + transaction.payment_status.slice(1)}
                      </span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{transaction.payment_method}</td>
                    <td>{new Date(transaction.created_at).toLocaleDateString()}</td>
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
