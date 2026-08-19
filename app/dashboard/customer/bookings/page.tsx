'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, API_BASE_URL } from '@/lib/api';
import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import Link from 'next/link';
import StripePayment from '@/components/StripePayment';

const GOOGLE_LIBRARIES: any[] = ['places'];

interface Booking {
  id: number;
  request_id: string;
  bin_type_name: string;
  bin_size: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  estimated_price?: string;
  total_price?: string;
  base_price?: string;
  additional_duration_charge?: string;
  duration_days?: number;
  exceeded_days?: number;
  gst_rate?: number;
  gst_amount?: number;
  start_date: string;
  end_date: string;
  location?: string;
  order_items_count: number;
  items?: any[];
  service_category?: string;
  service_names?: string;
  selected_services_count?: number;
  attachment_url?: string;
  additional_images?: string | string[];
  delivery_photo_url?: string;
  latitude?: string | number;
  longitude?: string | number;
  contact_number?: string;
  contact_email?: string;
  instructions?: string;
  po_number?: string;
  project_name?: string;
  supplier_name?: string;
  supplier_phone?: string;
  bill_id?: string;
}

const formatPrice = (p: string | number | undefined) => {
  const n = parseFloat((p || '0') as string);
  return isNaN(n) ? '$0.00' : `$${n.toFixed(2)}`;
};

const formatStatus = (s: string) =>
  s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'on_delivery': case 'delivered': case 'pickup': return '#22c55e';
    case 'ready_to_pickup': return '#f97316';
    case 'confirmed': case 'awaiting_payment': return '#3b82f6';
    case 'completed': return '#059669';
    case 'pending': return '#eab308';
    case 'cancelled': return '#ef4444';
    default: return '#6b7280';
  }
};

const formatDateRange = (start: string, end: string) => {
  if (!start && !end) return null;
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  if (!start) return fmt(end);
  if (!end) return fmt(start);
  const s = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${s} – ${fmt(end)}`;
};

function BookingsContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [mapMarkerSelected, setMapMarkerSelected] = useState<Booking | null>(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState<string[]>([]);
  const [paying, setPaying] = useState(false);
  const [payingBooking, setPayingBooking] = useState<Booking | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || '',
    libraries: GOOGLE_LIBRARIES,
  });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ requests: Booking[] }>('/bookings/my-requests');
      if (res.success && res.data) setBookings(res.data.requests || []);
    } catch (e) {
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const filtered = bookings.filter(b => {
    const q = searchQuery.toLowerCase();
    return !q || b.request_id.toLowerCase().includes(q) ||
      b.bin_type_name?.toLowerCase().includes(q) ||
      b.location?.toLowerCase().includes(q) ||
      b.service_names?.toLowerCase().includes(q);
  });

  const handleCancel = async (booking: Booking) => {
    if (booking.status !== 'pending') {
      showToast('Please contact customer service to cancel this order.', 'error');
      return;
    }
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await api.delete(`/bookings/${booking.id}`);
      if (res.success) {
        showToast('Order cancelled successfully', 'success');
        fetchBookings();
        setDetailsOpen(false);
      } else {
        showToast(res.message || 'Failed to cancel order', 'error');
      }
    } catch {
      showToast('Failed to cancel order', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handlePayNow = async (booking: Booking) => {
    if (!booking || booking.payment_method !== 'online') return;
    setPaying(true);
    try {
      const res = await api.post('/payments/create-intent', { requestId: booking.id }) as any;
      if (!res.success) { showToast(res.message || 'Failed to initiate payment', 'error'); return; }
      // If backend returns a hosted checkout URL, redirect to it
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else if (res.data?.clientSecret) {
        // Use embedded Stripe payment modal
        setPayingBooking(booking);
      }
    } catch {
      showToast('Payment error occurred', 'error');
    } finally {
      setPaying(false);
    }
  };

  const getAttachments = (b: Booking) => {
    const imgs: string[] = [];
    if (b.attachment_url) imgs.push(b.attachment_url);
    if (b.additional_images) {
      const parsed = Array.isArray(b.additional_images) ? b.additional_images : (() => { try { return JSON.parse(b.additional_images as string); } catch { return []; } })();
      imgs.push(...parsed);
    }
    if (b.delivery_photo_url) imgs.push(b.delivery_photo_url);
    return imgs;
  };

  const displayName = (b: Booking) =>
    b.service_category === 'service'
      ? (b.service_names?.split(',')[0] || 'General Service') + ((b.selected_services_count || 0) > 1 ? ` (+${(b.selected_services_count || 0) - 1} more)` : '')
      : (b.items?.length ?? 0) > 0
        ? `${b.items![0].bin_type_name}${b.items![0].bin_size ? ` - ${b.items![0].bin_size}` : ''}${(b.items?.length ?? 0) > 1 ? ` (+${(b.items?.length ?? 0) - 1} more)` : ''}`
        : `${b.bin_type_name}${b.bin_size ? ` - ${b.bin_size}` : ''}`;

  const mapCenter = filtered.find(b => b.latitude && b.longitude);

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>My Bookings</h1>
            <p className="text-gray-500 mt-1">View and manage your service orders</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white rounded-lg shadow-sm border p-1">
              <button onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-[#10B981] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  List
                </span>
              </button>
              <button onClick={() => setViewMode('map')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-[#10B981] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  Map
                </span>
              </button>
            </div>
            <Link href="/dashboard/customer/order"
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}>
              + New Order
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3.5 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search by ID, bin type or location..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
          </div>
        ) : viewMode === 'map' ? (
          <div className="h-[600px] w-full rounded-2xl overflow-hidden shadow border bg-white">
            {!isLoaded ? <div className="flex items-center justify-center h-full text-gray-500">Loading Map...</div> : (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter ? { lat: Number(mapCenter.latitude), lng: Number(mapCenter.longitude) } : { lat: 43.6532, lng: -79.3832 }}
                zoom={mapCenter ? 11 : 4}
                options={{ streetViewControl: false, mapTypeControl: false }}>
                {filtered.filter(b => b.latitude && b.longitude).map(b => (
                  <Marker key={b.id}
                    position={{ lat: Number(b.latitude), lng: Number(b.longitude) }}
                    onClick={() => setMapMarkerSelected(b)}
                    icon={{ url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${getStatusColor(b.status)}" width="32px" height="32px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>`), scaledSize: new window.google.maps.Size(32, 32) }} />
                ))}
                {mapMarkerSelected && mapMarkerSelected.latitude && (
                  <InfoWindow position={{ lat: Number(mapMarkerSelected.latitude), lng: Number(mapMarkerSelected.longitude) }} onCloseClick={() => setMapMarkerSelected(null)}>
                    <div className="p-2 max-w-[220px]">
                      <p className="font-bold text-sm text-gray-900">{displayName(mapMarkerSelected)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">#{mapMarkerSelected.request_id}</p>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => { setSelectedBooking(mapMarkerSelected); setDetailsOpen(true); setMapMarkerSelected(null); }}
                          className="flex-1 py-1 bg-gray-900 text-white text-xs rounded font-medium">Details</button>
                        <Link href={`/dashboard/customer/tracking?id=${mapMarkerSelected.id}`}
                          className="flex-1 py-1 bg-green-600 text-white text-xs rounded font-medium text-center">Track</Link>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-500">No bookings found</p>
            <Link href="/dashboard/customer/order" className="mt-3 inline-block text-green-600 font-medium hover:underline">Place an order →</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((b, index) => {
              const attachments = getAttachments(b);
              return (
                <div key={b.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5">
                    {/* Top Row */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <p className="font-bold text-gray-900">{displayName(b)}</p>
                        <p className="text-gray-400 text-sm mt-0.5">#{b.request_id}</p>
                        {b.project_name && <p className="text-xs text-blue-500 mt-0.5">📁 {b.project_name}</p>}
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                        style={{ color: getStatusColor(b.status), backgroundColor: getStatusColor(b.status) + '20' }}>
                        {formatStatus(b.status)}
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-gray-400 text-xs mb-0.5">Amount</p>
                        <p className="font-bold text-gray-900 text-sm">{formatPrice(b.total_price || b.estimated_price)}</p>
                      </div>
                      {formatDateRange(b.start_date, b.end_date) && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-gray-400 text-xs mb-0.5">Dates</p>
                          <p className="font-medium text-gray-900 text-sm">{formatDateRange(b.start_date, b.end_date)}</p>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-gray-400 text-xs mb-0.5">Payment</p>
                        <p className="font-medium text-gray-900 text-sm capitalize">{b.payment_status || 'pending'}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => { setSelectedBooking(b); setDetailsOpen(true); }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-full hover:bg-gray-700 transition-colors">
                        View Details
                      </button>
                      <Link href={`/dashboard/customer/tracking?id=${b.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full border border-green-500 text-green-600 hover:bg-green-50 transition-colors">
                        Track Order
                      </Link>
                      {b.status === 'awaiting_payment' && b.payment_method === 'online' && (
                        <button onClick={() => handlePayNow(b)} disabled={paying}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full text-white transition-colors"
                          style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}>
                          {paying ? 'Processing...' : '💳 Pay Now'}
                        </button>
                      )}
                      {b.status !== 'completed' && b.status !== 'cancelled' && (
                        <button onClick={() => handleCancel(b)} disabled={cancelling}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-full hover:bg-red-100 transition-colors">
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Details Modal */}
      {detailsOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDetailsOpen(false)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900">Booking Details</h3>
              <button onClick={() => setDetailsOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-3">
              {[
                { label: 'Order ID', value: `#${selectedBooking.request_id}` },
                selectedBooking.project_name && { label: 'Project', value: selectedBooking.project_name },
                selectedBooking.po_number && { label: 'PO Number', value: selectedBooking.po_number },
                { label: 'Status', value: formatStatus(selectedBooking.status) },
                { label: 'Service', value: displayName(selectedBooking) },
                selectedBooking.location && { label: 'Location', value: selectedBooking.location },
                formatDateRange(selectedBooking.start_date, selectedBooking.end_date) && { label: 'Dates', value: formatDateRange(selectedBooking.start_date, selectedBooking.end_date) },
                selectedBooking.duration_days && { label: 'Duration', value: `${selectedBooking.duration_days} Day(s)` },
                selectedBooking.base_price && parseFloat(selectedBooking.additional_duration_charge || '0') > 0 && { label: 'Base Price', value: formatPrice(selectedBooking.base_price) },
                selectedBooking.additional_duration_charge && parseFloat(selectedBooking.additional_duration_charge) > 0 && { label: `Extra Duration (${selectedBooking.exceeded_days} days)`, value: `+${formatPrice(selectedBooking.additional_duration_charge)}` },
                selectedBooking.gst_rate && selectedBooking.gst_rate > 0 && { label: `GST (${selectedBooking.gst_rate}%)`, value: formatPrice(selectedBooking.gst_amount) },
                { label: 'Total Amount', value: formatPrice(selectedBooking.total_price || selectedBooking.estimated_price) },
                { label: 'Payment Status', value: selectedBooking.payment_status || 'pending' },
                selectedBooking.payment_method && { label: 'Payment Method', value: selectedBooking.payment_method },
                selectedBooking.supplier_name && { label: 'Supplier', value: selectedBooking.supplier_name },
                selectedBooking.contact_number && { label: 'Contact Phone', value: selectedBooking.contact_number },
                selectedBooking.contact_email && { label: 'Contact Email', value: selectedBooking.contact_email },
                selectedBooking.instructions && { label: 'Instructions', value: selectedBooking.instructions },
              ].filter(Boolean).map((row: any) => (
                <div key={row.label} className="flex justify-between items-start py-2 border-b border-gray-50">
                  <span className="text-gray-500 text-sm">{row.label}</span>
                  <span className="text-gray-900 text-sm font-medium text-right max-w-[60%]">{row.value}</span>
                </div>
              ))}

              {/* Attachments */}
              {getAttachments(selectedBooking).length > 0 && (
                <div className="pt-2">
                  <p className="text-gray-500 text-sm mb-2">Attachments ({getAttachments(selectedBooking).length})</p>
                  <div className="flex gap-2 flex-wrap">
                    {getAttachments(selectedBooking).map((img, i) => (
                      <a key={i} href={`${API_BASE_URL}${img}`} target="_blank" rel="noreferrer">
                        <img src={`${API_BASE_URL}${img}`} alt="" className="h-20 w-20 object-cover rounded-xl border-2 border-gray-100" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t flex gap-3">
              {selectedBooking.status === 'awaiting_payment' && selectedBooking.payment_method === 'online' && (
                <button onClick={() => handlePayNow(selectedBooking)} disabled={paying}
                  className="flex-1 py-3 text-white font-semibold rounded-xl transition-all"
                  style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}>
                  {paying ? 'Processing...' : '💳 Pay Now'}
                </button>
              )}
              <Link href={`/dashboard/customer/tracking?id=${selectedBooking.id}`}
                className="flex-1 py-3 border border-green-500 text-green-600 font-semibold rounded-xl text-center hover:bg-green-50 transition-colors">
                Track Order
              </Link>
              {selectedBooking.status !== 'completed' && selectedBooking.status !== 'cancelled' && (
                <button onClick={() => handleCancel(selectedBooking)} disabled={cancelling}
                  className="py-3 px-5 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      {payingBooking && (
        <StripePayment
          requestId={payingBooking.id}
          amount={Math.round(parseFloat(payingBooking.total_price || payingBooking.estimated_price || '0') * 100)}
          onSuccess={() => {
            setPayingBooking(null);
            showToast('Payment successful!', 'success');
            fetchBookings();
          }}
          onCancel={() => setPayingBooking(null)}
        />
      )}
    </div>
  );
}

export default function CustomerBookingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <BookingsContent />
    </Suspense>
  );
}
