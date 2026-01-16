'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface ServiceRequest {
  id: number;
  request_id: string;
  customer_id: number;
  supplier_id: number | null;
  service_category: string;
  bin_type_id: number;
  bin_size_id: number;
  location: string;
  start_date: string;
  end_date: string;
  estimated_price: string;
  status: string;
  payment_status: string;
  bin_type_name: string;
  bin_size: string;
  customer_name: string;
  customer_phone: string;
  supplier_name: string | null;
  supplier_phone: string | null;
  created_at: string;
}

export default function BookingsPage() {
  const { showToast } = useToast();
  const [bookings, setBookings] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchBookings();
  }, [filterStatus]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const response = await api.get<{ requests: ServiceRequest[] }>(`/bookings/admin/all${params}`);
      if (response.success && response.data) {
        setBookings(response.data.requests);
      } else {
        showToast('Failed to fetch bookings', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge badge-supplier';
      case 'quoted':
        return 'badge badge-customer';
      case 'accepted':
        return 'badge badge-customer';
      case 'confirmed':
        return 'badge badge-admin';
      case 'in_progress':
        return 'badge badge-customer';
      case 'loaded':
        return 'badge badge-customer';
      case 'delivered':
        return 'badge badge-customer';
      case 'ready_to_pickup':
        return 'badge badge-customer';
      case 'picked_up':
        return 'badge badge-customer';
      case 'completed':
        return 'badge badge-admin';
      case 'cancelled':
        return 'badge badge-supplier';
      default:
        return 'badge';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Service Requests</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Manage all service requests and bookings</p>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('all')}
          >
            All
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'pending' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'quoted' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('quoted')}
          >
            Quoted
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'confirmed' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('confirmed')}
          >
            Confirmed
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'in_progress' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('in_progress')}
          >
            In Progress
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'loaded' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('loaded')}
          >
            Loaded
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'delivered' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('delivered')}
          >
            Delivered
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'ready_to_pickup' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('ready_to_pickup')}
          >
            Ready to Pickup
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'picked_up' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('picked_up')}
          >
            Picked Up
          </button>
          <button
            className={`btn btn-sm cursor-pointer ${filterStatus === 'completed' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus('completed')}
          >
            Completed
          </button>
        </div>

        {/* Bookings Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Customer</th>
                <th>Supplier</th>
                <th>Bin Details</th>
                <th>Location</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {booking.request_id}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{booking.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {booking.customer_phone}
                        </div>
                      </div>
                    </td>
                    <td>
                      {booking.supplier_name ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{booking.supplier_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {booking.supplier_phone}
                          </div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{booking.bin_type_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {booking.bin_size}
                        </div>
                      </div>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {booking.location}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>{formatDate(booking.start_date)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        to {formatDate(booking.end_date)}
                      </div>
                    </td>
                    <td>
                      <span className={`${getStatusBadgeClass(booking.status)} capitalize`}>{formatStatus(booking.status)}</span>
                    </td>
                    <td>
                      <span className={`badge ${booking.payment_status === 'paid' ? 'badge-admin' : 'badge-supplier'} capitalize`}>
                        {booking.payment_status || 'unpaid'}
                      </span>
                    </td>
                    <td>{new Date(booking.created_at).toLocaleDateString()}</td>
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
