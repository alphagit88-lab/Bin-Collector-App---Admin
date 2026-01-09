'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    loadStats();
  }, [authLoading, user]);

  const loadStats = async () => {
    try {
      setLoading(true);
      if (user?.role === 'admin') {
        const response = await api.get<{ users: any[] }>('/users');
        if (response.success && response.data) {
          setStats({ totalUsers: response.data.users.length || 0 });
        }
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem', color: 'var(--color-text-primary)' }}>Admin Dashboard</h1>

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
      </div>
    </div>
  );
}
