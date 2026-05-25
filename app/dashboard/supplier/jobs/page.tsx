'use client';

import { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { useSearchParams } from 'next/navigation';

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
  created_at: string;
  order_items_count?: number;
  attachment_url?: string;
  bill_id?: string;
  additional_images?: string[] | string;
  delivery_photo_url?: string;
}

function SupplierJobsContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  
  const [bookings, setBookings] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);
  const [selectedAttachments, setSelectedAttachments] = useState<string[] | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ requests: ServiceRequest[] }>('/bookings/supplier/requests');
      if (response.success && response.data) {
        setBookings(response.data.requests);
      } else {
        showToast('Failed to fetch jobs', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch jobs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'badge badge-supplier';
      case 'confirmed':
        return 'badge badge-admin';
      case 'on_delivery':
        return 'badge badge-customer';
      case 'delivered':
        return 'badge badge-customer';
      case 'ready_to_pickup':
        return 'badge badge-customer';
      case 'pickup':
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

  const filteredBookings = filterStatus === 'all' 
    ? bookings 
    : filterStatus === 'inProgress' 
      ? bookings.filter(b => ['on_delivery', 'delivered', 'pickup'].includes(b.status))
      : bookings.filter(b => b.status === filterStatus);

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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Active Jobs</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Manage your accepted bookings and update their status</p>
        </div>

        {/* Filters */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={`btn btn-sm cursor-pointer ${filterStatus === 'all' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterStatus('all')}>
            All
          </button>
          <button className={`btn btn-sm cursor-pointer ${filterStatus === 'confirmed' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterStatus('confirmed')}>
            Confirmed
          </button>
          <button className={`btn btn-sm cursor-pointer ${filterStatus === 'inProgress' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterStatus('inProgress')}>
            In Progress
          </button>
          <button className={`btn btn-sm cursor-pointer ${filterStatus === 'ready_to_pickup' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterStatus('ready_to_pickup')}>
            Ready to Pickup
          </button>
          <button className={`btn btn-sm cursor-pointer ${filterStatus === 'completed' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilterStatus('completed')}>
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
                <th>Bin Details</th>
                <th>Location</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Attachments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                    No jobs found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
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
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {booking.bin_type_name} - {booking.bin_size}
                          {booking.order_items_count && booking.order_items_count > 1 && (
                            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                              + more {booking.order_items_count - 1}
                            </span>
                          )}
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
                    <td>
                      {(() => {
                        let images: string[] = [];
                        if (booking.attachment_url) images.push(booking.attachment_url);
                        if (booking.additional_images) {
                          let parsed: string[] = [];
                          if (Array.isArray(booking.additional_images)) parsed = booking.additional_images;
                          else if (typeof booking.additional_images === 'string') {
                            try { parsed = JSON.parse(booking.additional_images); } catch(e) {}
                          }
                          images = [...images, ...parsed];
                        }
                        if (booking.delivery_photo_url) images.push(booking.delivery_photo_url);
                        
                        return images.length > 0 ? (
                          <button
                            onClick={() => setSelectedAttachments(images)}
                            className="cursor-pointer hover:underline text-[#10B981]"
                            style={{ background: 'none', border: 'none', padding: 0, fontWeight: 500 }}
                          >
                            View ({images.length})
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>-</span>
                        );
                      })()}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm">Update</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div >

      {/* Attachments Modal */}
      {selectedAttachments && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-8 md:p-12 lg:p-20 bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedAttachments(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8 border-b flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Attachments Preview</h3>
                <p className="text-sm text-gray-500 font-medium">View all uploaded photos</p>
              </div>
              <button
                onClick={() => setSelectedAttachments(null)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-900 hover:rotate-90 duration-300"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-10 bg-gray-50/80 overflow-y-auto flex-1">
              <div className="flex flex-col gap-6">
                {selectedAttachments.map((img, idx) => (
                  <div key={idx} className="flex justify-center">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'}${img}`}
                      alt={`Attachment ${idx + 1}`}
                      className="max-w-full max-h-[70vh] w-auto object-contain rounded-3xl shadow-2xl border-4 border-white"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 md:p-8 border-t flex justify-end bg-white/50 backdrop-blur-md sticky bottom-0 z-10">
              <button
                onClick={() => setSelectedAttachments(null)}
                className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black tracking-wide hover:bg-black transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-black/20"
              >
                CLOSE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}

export default function SupplierJobsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SupplierJobsContent />
    </Suspense>
  );
}
