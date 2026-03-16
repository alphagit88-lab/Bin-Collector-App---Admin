'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Transaction {
  id: number;
  transaction_id: string;
  booking_id: string;
  amount: number;
  commission_amount: number;
  net_amount: number;
  payment_method: string;
  payment_status: string;
  transaction_type: string;
  description: string;
  created_at: string;
}

export default function CustomerPaymentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalTransactions: 0,
    pendingPayments: 0,
  });

  useEffect(() => {
    if (user?.role !== 'customer') {
      router.push('/dashboard');
      return;
    }
    fetchTransactions();
  }, [user, router]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Fetch customer's transactions
      const response = await api.get<{ transactions: Transaction[] }>('/transactions/my?transaction_type=payment');
      if (response.success) {
        // Backend returns: { success: true, transactions: [...] }
        const allTransactions = response.transactions || response.data?.transactions || [];
        setTransactions(allTransactions);

        // Calculate stats
        setStats({
          totalSpent: allTransactions
            .filter(t => t.payment_status === 'completed')
            .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
          totalTransactions: allTransactions.length,
          pendingPayments: allTransactions.filter(t => t.payment_status === 'pending').length,
        });
      }
    } catch (error) {
      showToast('Failed to load payment history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
          Payment History
        </h1>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Total Spent</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{formatCurrency(stats.totalSpent)}</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '4px' }}>Transactions</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>{stats.totalTransactions}</div>
          </div>
        </div>

        {/* Transactions List */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Recent Payments</h2>

          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>💳</div>
              <div>No payment history</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  style={{
                    padding: '16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                        {transaction.booking_id}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                        {formatDate(transaction.created_at)}
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: transaction.payment_status === 'completed' ? '#10B98120' : '#F59E0B20',
                      color: transaction.payment_status === 'completed' ? '#10B981' : '#F59E0B'
                    }}>
                      {transaction.payment_status}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '2px' }}>Amount</div>
                      <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
                        {formatCurrency(parseFloat(transaction.amount.toString()))}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      {transaction.payment_method}
                    </div>
                  </div>
                  {transaction.description && (
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '8px' }}>
                      {transaction.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
