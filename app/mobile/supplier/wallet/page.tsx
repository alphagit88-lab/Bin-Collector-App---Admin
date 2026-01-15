'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Wallet {
  id: number;
  supplier_id: number;
  balance: string;
  pending_balance: string;
  total_earned: string;
}

interface WalletTransaction {
  id: number;
  amount: string;
  transaction_type: string;
  description: string;
  status: string;
  created_at: string;
}

interface Payout {
  id: number;
  payout_id: string;
  amount: string;
  status: string;
  created_at: string;
  processed_at: string | null;
}

export default function SupplierWalletPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [walletRes, transactionsRes, payoutsRes] = await Promise.all([
        api.get<{ wallet: Wallet }>('/wallet'),
        api.get<{ transactions: WalletTransaction[] }>('/wallet/transactions'),
        api.get<{ payouts: Payout[] }>('/wallet/payouts'),
      ]);

      if (walletRes.success && walletRes.data) {
        setWallet(walletRes.data.wallet);
      }
      if (transactionsRes.success && transactionsRes.data) {
        setTransactions(transactionsRes.data.transactions);
      }
      if (payoutsRes.success && payoutsRes.data) {
        setPayouts(payoutsRes.data.payouts);
      }
    } catch (error) {
      showToast('Failed to load wallet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet) return;

    const amount = parseFloat(payoutAmount);
    if (amount <= 0 || amount > parseFloat(wallet.balance)) {
      showToast('Invalid amount', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/wallet/payout', {
        amount,
        payment_method: 'bank_transfer',
      });

      if (response.success) {
        showToast('Payout request submitted successfully', 'success');
        setShowPayoutModal(false);
        setPayoutAmount('');
        fetchData();
      } else {
        showToast(response.message || 'Failed to request payout', 'error');
      }
    } catch (error) {
      showToast('Failed to request payout', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!wallet) {
    return null;
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      padding: '1rem',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>My Wallet</h1>

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>Available Balance</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10B981' }}>
            ${parseFloat(wallet.balance).toFixed(2)}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Pending</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>${parseFloat(wallet.pending_balance).toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Total Earned</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>${parseFloat(wallet.total_earned).toFixed(2)}</div>
          </div>
        </div>

        {parseFloat(wallet.balance) > 0 && (
          <button
            onClick={() => setShowPayoutModal(true)}
            style={{
              width: '100%',
              marginTop: '1rem',
              padding: '0.75rem',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Request Payout
          </button>
        )}
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Transactions</h2>
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
            No transactions yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{tx.description || tx.transaction_type}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ 
                  fontWeight: 600,
                  color: tx.transaction_type === 'credit' ? '#10B981' : '#EF4444'
                }}>
                  {tx.transaction_type === 'credit' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Payout History</h2>
        {payouts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
            No payouts yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {payouts.map((payout) => (
              <div key={payout.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{payout.payout_id}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    {new Date(payout.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontWeight: 600, textAlign: 'right' }}>${parseFloat(payout.amount).toFixed(2)}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6B7280', textAlign: 'right', textTransform: 'capitalize' }}>
                    {payout.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPayoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }} onClick={() => setShowPayoutModal(false)}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '100%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Request Payout</h3>
            <form onSubmit={handleRequestPayout}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={wallet.balance}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                />
                <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                  Available: ${parseFloat(wallet.balance).toFixed(2)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    backgroundColor: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    opacity: submitting ? 0.6 : 1
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
