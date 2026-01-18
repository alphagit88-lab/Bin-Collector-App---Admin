'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { useSocket } from '@/contexts/SocketContext';
import Link from 'next/link';
import { api } from '@/lib/api';

interface ServiceRequest {
  id: number;
  request_id: string;
  bin_type_name: string;
  bin_size: string;
  location: string;
  status: string;
  created_at: string;
  order_items_count?: number;
}

interface Wallet {
  balance: number;
  pending_balance: number;
  total_earned: number;
}

export default function SupplierDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { socket } = useSocket();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeJobs: 0,
    pendingRequests: 0,
    completed: 0,
    totalBins: 0,
  });

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    fetchData();

    if (socket) {
      socket.on('new_request', (data) => {
        showToast('New request received!', 'success');
        fetchData();
      });

      socket.on('request_accepted', (data) => {
        showToast('Request accepted!', 'success');
        fetchData();
      });

      return () => {
        socket.off('new_request');
        socket.off('request_accepted');
      };
    }
  }, [user, router, socket]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [requestsRes, walletRes, binsRes] = await Promise.all([
        api.get<{ requests: ServiceRequest[] }>('/bookings/supplier/requests'),
        api.get<{ wallet: Wallet }>('/wallet'),
        api.get<{ bins: any[] }>('/bins/physical'),
      ]);

      if (requestsRes.success && requestsRes.data) {
        const allRequests = requestsRes.data.requests;
        setRequests(allRequests.slice(0, 5)); // Show recent 5

        setStats({
          activeJobs: allRequests.filter(r => ['confirmed', 'on_delivery', 'delivered', 'ready_to_pickup', 'pickup'].includes(r.status)).length,
          pendingRequests: allRequests.filter(r => r.status === 'pending').length,
          completed: allRequests.filter(r => r.status === 'completed').length,
          totalBins: binsRes.success ? (binsRes.bins || binsRes.data?.bins || []).length : 0,
        });
      }

      if (walletRes.success && walletRes.data) {
        setWallet(walletRes.data.wallet);
      }
    } catch (error) {
      showToast('Failed to load dashboard data', 'error');
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
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            Welcome, {user?.name}! 🚚
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>Manage your bin rental services</p>
        </div>

        {/* Wallet Balance */}
        {wallet && (
          <div style={{
            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
            padding: '20px',
            borderRadius: '12px',
            color: 'white',
            marginBottom: '24px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '8px' }}>Available Balance</div>
            <div style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '12px' }}>
              {formatCurrency(parseFloat(wallet.balance.toString()))}
            </div>
            <Link href="/mobile/supplier/wallet" style={{ color: 'white', textDecoration: 'none', fontSize: '0.875rem', cursor: 'pointer' }}>
              View Wallet →
            </Link>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981', marginBottom: '4px' }}>{stats.activeJobs}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Active Jobs</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F59E0B', marginBottom: '4px' }}>{stats.pendingRequests}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Pending</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3B82F6', marginBottom: '4px' }}>{stats.completed}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Completed</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8B5CF6', marginBottom: '4px' }}>{stats.totalBins}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Total Bins</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <Link href="/mobile/supplier/notifications" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔔</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>New Requests</div>
            </div>
          </Link>
          <Link href="/mobile/supplier/fleet" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🚛</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>Fleet</div>
            </div>
          </Link>
          <Link href="/mobile/supplier/service-area" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>📍</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>Service Area</div>
            </div>
          </Link>
          <Link href="/mobile/supplier/availability" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>⏰</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>Availability</div>
            </div>
          </Link>
        </div>

        {/* Additional Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <Link href="/mobile/supplier/wallet" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💰</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>Payouts</div>
            </div>
          </Link>
          <Link href="/mobile/supplier/account" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>👤</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>Account</div>
            </div>
          </Link>
        </div>

        {/* Recent Jobs */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>Recent Jobs</h2>
            <Link href="/mobile/supplier/jobs" style={{ fontSize: '0.875rem', color: '#3B82F6', textDecoration: 'none', cursor: 'pointer' }}>
              View All
            </Link>
          </div>

          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📋</div>
              <div>No jobs yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/mobile/supplier/jobs`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{
                    padding: '16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3B82F6';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                          {request.bin_type_name} - {request.bin_size}
                          {request.order_items_count && request.order_items_count > 1 && (
                            <span style={{ color: '#6B7280', fontWeight: 400, marginLeft: '0.5rem' }}>
                              + more {request.order_items_count - 1}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{request.request_id}</div>
                      </div>
                      <div style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: '#3B82F620',
                        color: '#3B82F6'
                      }}>
                        {request.status}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      📍 {request.location}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
