'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{
    totalUsers: number;
    supplierCounts?: {
      pending: number;
      confirmed: number;
      inProgress: number;
      readyToPickup: number;
      completed: number;
    };
    wallet?: { balance: string; pending_balance: string; total_earned: string };
  }>({
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Redirect customers and drivers to mobile pages
    if (user?.role === 'customer') {
      router.push('/mobile/customer/orders');
      return;
    }
    if (user?.role === 'driver') {
      router.push('/mobile/driver/dashboard');
      return;
    }

    loadStats();
  }, [authLoading, user, router]);

  const loadStats = async () => {
    try {
      setLoading(true);
      if (user?.role === 'admin') {
        const response = await api.get<{ users: any[] }>('/users');
        if (response.success && response.data?.users) {
          setStats(prev => ({ ...prev, totalUsers: response.data?.users.length || 0 }));
        }
      } else if (user?.role === 'supplier') {
        // Fetch supplier stats
        const pendingResponse = await api.get<{ requests: any[] }>('/bookings/supplier/pending');
        const jobsResponse = await api.get<{ requests: any[] }>('/bookings/supplier/requests');
        const walletResponse = await api.get<{ wallet: any }>('/wallet');
        
        const pending = pendingResponse.data?.requests?.length || 0;
        const myJobs = jobsResponse.data?.requests || [];
        const confirmed = myJobs.filter((j: any) => ['confirmed', 'awaiting_payment'].includes(j.status)).length;
        const inProgress = myJobs.filter((j: any) => ['on_delivery', 'delivered', 'pickup'].includes(j.status)).length;
        const readyToPickup = myJobs.filter((j: any) => j.status === 'ready_to_pickup').length;
        const completed = myJobs.filter((j: any) => j.status === 'completed').length;
        
        setStats(prev => ({
          ...prev,
          supplierCounts: { pending, confirmed, inProgress, readyToPickup, completed },
          wallet: walletResponse.data?.wallet
        }));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--color-text-primary)' }}>
          {user?.role === 'admin' ? 'Admin Dashboard' : 'Supplier Dashboard'}
        </h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {user?.role === 'admin' && (
            <>
              <Link href="/dashboard/users" className="dashboard-card rounded-lg p-6 cursor-pointer">
              <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Total Users</p>
              <p className="text-5xl font-bold" style={{ color: '#10B981' }}>{stats.totalUsers}</p>
            </Link>
              <Link href="/dashboard/bins" className="dashboard-card rounded-lg p-6 cursor-pointer">
                <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>Bin Management</p>
                <p className="text-2xl font-bold" style={{ color: '#10B981' }}>Configure</p>
              </Link>
              <Link href="/dashboard/settings" className="dashboard-card rounded-lg p-6 cursor-pointer">
                <p className="text-sm mb-3 font-light" style={{ color: 'var(--color-text-secondary)' }}>System Settings</p>
                <p className="text-2xl font-bold" style={{ color: '#10B981' }}>Manage</p>
              </Link>
            </>
          )}
        </div>

        {/* Quick Actions */}
        {user?.role === 'admin' && (
          <div className="dashboard-card rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/dashboard/users/admins"
                className="p-4 rounded-lg dashboard-card cursor-pointer"
              >
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Manage Admins</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Create and manage administrator accounts</p>
              </Link>
              <Link
                href="/dashboard/users/customers"
                className="p-4 rounded-lg dashboard-card cursor-pointer"
              >
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>View Customers</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>View all customer accounts</p>
              </Link>
              <Link
                href="/dashboard/users/suppliers"
                className="p-4 rounded-lg dashboard-card cursor-pointer"
              >
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>View Suppliers</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>View all supplier accounts</p>
              </Link>
              <Link
                href="/dashboard/bins"
                className="p-4 rounded-lg dashboard-card cursor-pointer"
              >
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>Bin Types & Sizes</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Manage bin types and sizes</p>
              </Link>
              <Link
                href="/dashboard/settings"
                className="p-4 rounded-lg dashboard-card cursor-pointer"
              >
                <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>System Settings</h3>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Configure system parameters</p>
              </Link>
            </div>
          </div>
        )}

        {/* Supplier Stats Grid */}
        {user?.role === 'supplier' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Link href="/dashboard/supplier/earnings" className="dashboard-card rounded-lg p-6 cursor-pointer" style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)', color: 'white' }}>
                <p className="text-sm mb-3 font-light text-white/80">Available Balance</p>
                <p className="text-5xl font-bold">${stats.wallet ? parseFloat(stats.wallet.balance).toFixed(2) : '0.00'}</p>
              </Link>
              <Link href="/dashboard/supplier/requests" className="dashboard-card rounded-lg p-6 cursor-pointer border border-[#C4CA00]/30">
                <p className="text-sm mb-3 font-light text-gray-500">Pending Requests</p>
                <p className="text-4xl font-bold" style={{ color: '#C4CA00' }}>{stats.supplierCounts?.pending.toString().padStart(2, '0')}</p>
              </Link>
              <Link href="/dashboard/supplier/jobs" className="dashboard-card rounded-lg p-6 cursor-pointer border border-[#408FC7]/30">
                <p className="text-sm mb-3 font-light text-gray-500">Confirmed Bookings</p>
                <p className="text-4xl font-bold" style={{ color: '#408FC7' }}>{stats.supplierCounts?.confirmed.toString().padStart(2, '0')}</p>
              </Link>
              <Link href="/dashboard/supplier/jobs?status=inProgress" className="dashboard-card rounded-lg p-6 cursor-pointer border border-[#66E91F]/30">
                <p className="text-sm mb-3 font-light text-gray-500">In-Progress Jobs</p>
                <p className="text-4xl font-bold" style={{ color: '#66E91F' }}>{stats.supplierCounts?.inProgress.toString().padStart(2, '0')}</p>
              </Link>
              <Link href="/dashboard/supplier/jobs?status=ready_to_pickup" className="dashboard-card rounded-lg p-6 cursor-pointer border border-[#FF9500]/30">
                <p className="text-sm mb-3 font-light text-gray-500">Ready To Pickup</p>
                <p className="text-4xl font-bold" style={{ color: '#FF9500' }}>{stats.supplierCounts?.readyToPickup.toString().padStart(2, '0')}</p>
              </Link>
              <Link href="/dashboard/supplier/jobs?status=completed" className="dashboard-card rounded-lg p-6 cursor-pointer border border-[#2E8015]/30">
                <p className="text-sm mb-3 font-light text-gray-500">Completed Jobs</p>
                <p className="text-4xl font-bold" style={{ color: '#2E8015' }}>{stats.supplierCounts?.completed.toString().padStart(2, '0')}</p>
              </Link>
            </div>

            {/* Quick Actions for Suppliers */}
            <div className="dashboard-card rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/dashboard/supplier/create-order"
                  className="p-6 rounded-xl dashboard-card cursor-pointer flex items-center group hover:border-[#10B981] transition-all"
                  style={{ background: 'rgba(16, 185, 129, 0.05)' }}
                >
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mr-4 group-hover:bg-green-500 group-hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>Create New Order</h3>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Assign a booking to an existing or new customer</p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/supplier/operations/fleet"
                  className="p-6 rounded-xl dashboard-card cursor-pointer flex items-center group hover:border-[#408FC7] transition-all"
                  style={{ background: 'rgba(64, 143, 199, 0.05)' }}
                >
                  <div className="w-12 h-12 rounded-full bg-[#408FC7]/10 flex items-center justify-center mr-4 group-hover:bg-[#408FC7] group-hover:text-white transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>Manage Fleet</h3>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Configure bins, types, and area-specific pricing</p>
                  </div>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
