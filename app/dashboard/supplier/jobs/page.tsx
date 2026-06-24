'use client';

import { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import JobDetailModal from '@/components/dashboard/JobDetailModal';
import { useSearchParams } from 'next/navigation';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem'
};

const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832
};

const GOOGLE_LIBRARIES: any[] = ["places"];

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
  latitude: number | null;
  longitude: number | null;
}

function SupplierJobsContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [bookings, setBookings] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);
  const [filterCustomer, setFilterCustomer] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAttachments, setSelectedAttachments] = useState<string[] | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedJob, setSelectedJob] = useState<ServiceRequest | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || '',
    libraries: GOOGLE_LIBRARIES
  });

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

  const filteredBookings = bookings.filter((b) => {
    // Status filter
    const statusMatch =
      filterStatus === 'all'
        ? true
        : filterStatus === 'inProgress'
          ? ['on_delivery', 'delivered', 'pickup'].includes(b.status)
          : b.status === filterStatus;

    // Customer dropdown filter
    const customerMatch = filterCustomer
      ? b.customer_name === filterCustomer
      : true;

    // Search term filter (searches request ID and customer name)
    const searchMatch = searchTerm
      ? b.request_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    // Date range filter
    const dateMatch = (() => {
      if (!filterStartDate && !filterEndDate) return true;
      const start = filterStartDate ? new Date(filterStartDate) : null;
      const end = filterEndDate ? new Date(filterEndDate) : null;
      const bookingStart = new Date(b.start_date);
      const bookingEnd = new Date(b.end_date);
      if (start && end) {
        return bookingStart >= start && bookingEnd <= end;
      } else if (start) {
        return bookingStart >= start;
      } else if (end) {
        return bookingEnd <= end;
      }
      return true;
    })();

    return statusMatch && customerMatch && searchMatch && dateMatch;
  });

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
    <div className="min-h-screen p-8 bg-bg-secondary">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-2">Active Jobs</h1>
            <p className="text-secondary mb-4 sm:mb-0">Manage your accepted bookings and update their status</p>
          </div>
          <div className="flex bg-white/50 backdrop-blur-md rounded-lg shadow-sm border p-1 mt-4 sm:mt-0">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-[#10B981] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                List View
              </div>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-[#10B981] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Map View
              </div>
            </button>
          </div>
        </div>
          {/* Filters and Search */}
          <div className="flex flex-wrap gap-4 items-center bg-white/10 backdrop-blur-lg py-6">
            {/* Search Field */}
            <input
              type="text"
              placeholder="Search jobs..."
              className="input input-sm w-auto border border-gray-300 rounded-md px-3 py-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Status Dropdown */}
            <select
              className="select select-sm border border-gray-300 rounded-md px-3 py-1"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="inProgress">In Progress</option>
              <option value="ready_to_pickup">Ready to Pickup</option>
              <option value="completed">Completed</option>
            </select>

            {/* Customer Dropdown */}
            <select
              className="select select-sm border border-gray-300 rounded-md px-3 py-1"
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
            >
              <option value="">All Customers</option>
              {Array.from(new Set(bookings.map(b => b.customer_name))).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {/* Date Range */}
            <input
              type="date"
              className="input input-sm border border-gray-300 rounded-md px-3 py-1"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
            <span className="mx-1">to</span>
            <input
              type="date"
              className="input input-sm border border-gray-300 rounded-md px-3 py-1"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>

        {/* Bookings Content */}
        {viewMode === 'list' ? (
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
                            try { parsed = JSON.parse(booking.additional_images); } catch (e) { }
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
                      <button 
                        onClick={() => setSelectedJobId(booking.id)}
                        className="btn btn-outline btn-sm"
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        ) : (
          <div className="h-[600px] w-full rounded-xl overflow-hidden shadow-md border relative bg-white mt-6">
            {!isLoaded ? (
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                Loading Map...
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={filteredBookings.find(b => b.latitude && b.longitude) ? { lat: Number(filteredBookings.find(b => b.latitude && b.longitude)?.latitude), lng: Number(filteredBookings.find(b => b.latitude && b.longitude)?.longitude) } : defaultCenter}
                zoom={filteredBookings.some(b => b.latitude && b.longitude) ? 10 : 4}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: false
                }}
              >
                {filteredBookings.filter(b => b.latitude && b.longitude).map(booking => (
                  <Marker
                    key={booking.id}
                    position={{ lat: Number(booking.latitude), lng: Number(booking.longitude) }}
                    onClick={() => setSelectedJob(booking)}
                    icon={{
                      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10B981" width="36px" height="36px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>'),
                      scaledSize: new window.google.maps.Size(36, 36),
                    }}
                  />
                ))}

                {selectedJob && selectedJob.latitude && selectedJob.longitude && (
                  <InfoWindow
                    position={{ lat: Number(selectedJob.latitude), lng: Number(selectedJob.longitude) }}
                    onCloseClick={() => setSelectedJob(null)}
                  >
                    <div className="p-3 max-w-[250px]">
                      <div className="font-bold text-gray-900 border-b pb-2 mb-2">
                        {selectedJob.bin_type_name} - {selectedJob.bin_size}
                        {selectedJob.order_items_count && selectedJob.order_items_count > 1 && (
                          <span className="text-xs text-gray-500 font-normal ml-1">
                            (+{selectedJob.order_items_count - 1} more)
                          </span>
                        )}
                      </div>
                      <div className="text-sm mb-1">
                        <span className="font-medium">Customer:</span> {selectedJob.customer_name}
                      </div>
                      <div className="text-sm mb-1">
                        <span className="font-medium">Status:</span> <span className={`capitalize ${getStatusBadgeClass(selectedJob.status)}`}>{formatStatus(selectedJob.status)}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2 mb-3">
                        {selectedJob.location}
                      </div>
                      <div className="w-full pt-2 border-t">
                        <button 
                          onClick={() => {
                            setSelectedJob(null);
                            setSelectedJobId(selectedJob.id);
                          }}
                          className="w-full py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-medium rounded transition-colors"
                        >
                          Update Job
                        </button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        )}
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

      {selectedJobId !== null && (
        <JobDetailModal
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onJobUpdated={fetchBookings}
        />
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
