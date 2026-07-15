'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Booking {
  id: number;
  request_id: string;
  bin_type_name: string;
  bin_size: string;
  status: string;
  estimated_price: string;
  total_price?: string;
  start_date: string;
  end_date: string;
  order_items_count: number;
  items?: any[];
  service_category?: string;
  service_names?: string;
  selected_services_count?: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const formatPrice = (price: string | number) => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'on_delivery': case 'delivered': case 'pickup': return 'bg-green-100 text-green-700';
    case 'ready_to_pickup': return 'bg-orange-100 text-orange-700';
    case 'confirmed': case 'awaiting_payment': return 'bg-blue-100 text-blue-700';
    case 'completed': return 'bg-emerald-100 text-emerald-700';
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
};

const formatStatus = (status: string) =>
  status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await api.get<{ requests: Booking[] }>('/bookings/my-requests');
      if (response.success && response.data) {
        setBookings(response.data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const activeBookings = bookings.filter(b => !['completed', 'cancelled'].includes(b.status.toLowerCase()));
  const completedCount = bookings.filter(b => b.status.toLowerCase() === 'completed').length;
  const totalSpent = bookings
    .filter(b => b.status.toLowerCase() !== 'cancelled')
    .reduce((sum, b) => {
      const price = parseFloat((b.total_price || b.estimated_price || '0') as string);
      return sum + (isNaN(price) ? 0 : price);
    }, 0);

  const recentBookings = bookings.slice(0, 3);

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <p className="text-gray-500 text-sm font-medium">{getGreeting()},</p>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {user?.name || 'Customer'}
            </h1>
            <p className="text-gray-500 mt-1">Welcome to your BinDrop dashboard</p>
          </div>
          <Link href="/dashboard/customer/order"
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition-all hover:opacity-90 hover:shadow-md"
            style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Order New Bin
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {/* Active Bookings */}
          <Link href="/dashboard/customer/tracking">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 font-medium text-sm">Tracking</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-gray-900">{String(activeBookings.length).padStart(2, '0')}</p>
              <p className="text-gray-500 text-sm mt-1">Active Bookings</p>
            </div>
          </Link>

          {/* History */}
          <Link href="/dashboard/customer/bookings">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 font-medium text-sm">History</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <p className="text-4xl font-bold text-gray-900">{String(completedCount).padStart(2, '0')}</p>
              <p className="text-gray-500 text-sm mt-1">Completed Services</p>
            </div>
          </Link>

          {/* Total Spent */}
          <Link href="/dashboard/customer/billing">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 font-medium text-sm">Payments</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatPrice(totalSpent)}</p>
              <p className="text-gray-500 text-sm mt-1">Total Spent</p>
            </div>
          </Link>
        </div>

        {/* Projects Quick Access */}
        <Link href="/dashboard/customer/projects">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer flex items-center justify-between mb-6">
            <div>
              <p className="font-semibold text-gray-900">Projects</p>
              <p className="text-gray-500 text-sm mt-0.5">Group your orders into projects</p>
            </div>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Link>

        {/* Recent Bookings */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Bookings</h2>
            <Link href="/dashboard/customer/bookings"
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}>
              View all
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
            </div>
          ) : recentBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-500">No recent bookings</p>
              <Link href="/dashboard/customer/order" className="mt-3 inline-block text-green-600 font-medium text-sm hover:underline">
                Place your first order →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentBookings.map((booking) => {
                const displayName = booking.service_category === 'service'
                  ? (booking.service_names?.split(',')[0] || 'General Service') +
                    ((booking.selected_services_count || 0) > 1 ? ` (+${(booking.selected_services_count || 0) - 1})` : '')
                  : booking.items && booking.items.length > 0
                    ? `${booking.items[0].bin_type_name}${booking.items[0].bin_size ? ` - ${booking.items[0].bin_size}` : ''}`
                    : `${booking.bin_type_name}${booking.bin_size ? ` - ${booking.bin_size}` : ''}`;
                return (
                  <div key={booking.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{displayName}</p>
                      <p className="text-gray-400 text-sm mt-0.5">#{booking.request_id}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {formatStatus(booking.status)}
                      </span>
                      <Link href={`/dashboard/customer/tracking?id=${booking.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-full hover:bg-gray-700 transition-colors">
                        View
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
