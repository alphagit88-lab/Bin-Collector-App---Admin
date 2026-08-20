'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { api, API_BASE_URL } from '@/lib/api';
import Link from 'next/link';

interface ServiceRequest {
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
  contact_number?: string;
  contact_email?: string;
  instructions?: string;
  po_number?: string;
  project_name?: string;
  supplier_name?: string;
  supplier_phone?: string;
}

const STATUS_STEPS = [
  { key: 'created', label: 'Order Created', icon: '📋', isStatic: true },
  { key: 'pending', label: 'Pending', icon: '⏳' },
  { key: 'awaiting_payment', label: 'Awaiting Payment', icon: '💳' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'on_delivery', label: 'On Delivery', icon: '🚛' },
  { key: 'delivered', label: 'Delivered', icon: '📦' },
  { key: 'ready_to_pickup', label: 'Ready to Pickup', icon: '🔄' },
  { key: 'pickup', label: 'Pickup', icon: '⬇️' },
  { key: 'completed', label: 'Completed', icon: '🎉' },
];

const getStatusOrder = (status: string) => {
  const normalized = status.toLowerCase();
  let stepKey = normalized;
  if (normalized === 'loaded') stepKey = 'on_delivery';
  if (normalized === 'cash_collected') stepKey = 'delivered';
  
  const idx = STATUS_STEPS.findIndex(s => s.key === stepKey);
  return idx === -1 ? 0 : idx;
};

const formatPrice = (p: string | number | undefined) => {
  const n = parseFloat((p || '0') as string);
  return isNaN(n) ? '$0.00' : `$${n.toFixed(2)}`;
};

const formatStatus = (s: string) =>
  s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return '#059669';
    case 'cancelled': return '#ef4444';
    case 'on_delivery': case 'loaded': case 'delivered': case 'cash_collected': return '#8b5cf6';
    case 'confirmed': return '#10B981';
    case 'awaiting_payment': return '#3b82f6';
    case 'pending': return '#f59e0b';
    case 'ready_to_pickup': return '#ef4444';
    case 'pickup': return '#6b7280';
    default: return '#9ca3af';
  }
};

const formatDateRange = (start: string, end: string) => {
  if (!start && !end) return null;
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  if (!start) return fmt(end);
  if (!end) return fmt(start);
  return `${new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${fmt(end)}`;
};

function TrackingContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const requestIdParam = searchParams.get('id');

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [markingReady, setMarkingReady] = useState<number | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ requests: ServiceRequest[] }>('/bookings/my-requests');
      if (res.success && res.data) {
        const all = res.data.requests || [];
        setRequests(all);
        if (requestIdParam) {
          const target = all.find(r => r.id === parseInt(requestIdParam));
          setSelectedRequest(target || all[0] || null);
        } else {
          const active = all.find(r => !['completed', 'cancelled'].includes(r.status.toLowerCase()));
          setSelectedRequest(active || all[0] || null);
        }
      }
    } catch (e) {
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [requestIdParam]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const filtered = requests.filter(r => {
    const q = searchQuery.toLowerCase();
    return !q || r.request_id.toLowerCase().includes(q) ||
      r.bin_type_name?.toLowerCase().includes(q) ||
      r.location?.toLowerCase().includes(q);
  });

  const handleCancel = async () => {
    if (!selectedRequest) return;
    if (selectedRequest.status !== 'pending') {
      showToast('Please contact customer service to cancel this order.', 'error');
      return;
    }
    if (!confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await api.delete(`/bookings/${selectedRequest.id}`);
      if (res.success) { showToast('Order cancelled', 'success'); fetchRequests(); }
      else showToast(res.message || 'Cancel failed', 'error');
    } catch { showToast('Cancel failed', 'error'); }
    finally { setCancelling(false); }
  };

  const handlePayNow = async () => {
    if (!selectedRequest || selectedRequest.payment_method !== 'online') return;
    setPaying(true);
    try {
      const res = await api.post('/payments/create-intent', { requestId: selectedRequest.id }) as any;
      if (!res.success) { showToast(res.message || 'Payment failed', 'error'); return; }
      if (res.data?.url) window.location.href = res.data.url;
    } catch { showToast('Payment error', 'error'); }
    finally { setPaying(false); }
  };

  const handleSingleBinMarkReady = async (itemId: number) => {
    if (!selectedRequest) return;
    if (!confirm('Mark this bin as ready for pickup?')) return;
    setMarkingReady(itemId);
    try {
      const res = await api.put(`/bookings/${selectedRequest.id}/order-items/${itemId}/status`, { status: 'ready_to_pickup' }) as any;
      if (res.success) {
        showToast('Bin marked as ready for pickup', 'success');
        fetchRequests();
      } else {
        showToast(res.message || 'Failed to update', 'error');
      }
    } catch { showToast('Error updating bin status', 'error'); }
    finally { setMarkingReady(null); }
  };

  const getAttachments = (r: ServiceRequest) => {
    const imgs: string[] = [];
    if (r.attachment_url) imgs.push(r.attachment_url);
    if (r.additional_images) {
      const parsed = Array.isArray(r.additional_images) ? r.additional_images : (() => { try { return JSON.parse(r.additional_images as string); } catch { return []; } })();
      imgs.push(...parsed);
    }
    if (r.delivery_photo_url) imgs.push(r.delivery_photo_url);
    return imgs;
  };

  const displayName = (r: ServiceRequest) =>
    r.service_category === 'service'
      ? (r.service_names?.split(',')[0] || 'General Service') + ((r.selected_services_count || 0) > 1 ? ` (+${(r.selected_services_count || 0) - 1} more)` : '')
      : (r.items?.length ?? 0) > 0
        ? `${r.items![0].bin_type_name}${r.items![0].bin_size ? ` - ${r.items![0].bin_size}` : ''}${(r.items?.length ?? 0) > 1 ? ` (+${(r.items?.length ?? 0) - 1} more)` : ''}`
        : `${r.bin_type_name}${r.bin_size ? ` - ${r.bin_size}` : ''}`;

  const currentStepIdx = selectedRequest ? getStatusOrder(selectedRequest.status) : 0;

  const steps = STATUS_STEPS.filter(s => {
    if (s.key === 'awaiting_payment') return selectedRequest?.payment_method === 'online';
    return true;
  });

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-6xl mx-auto">

        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Track My Order</h1>
          <p className="text-gray-500 mt-1">Monitor the status of your service requests</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Request List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <div className="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" placeholder="Search orders..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-7 h-7 border-2 rounded-full animate-spin" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm px-4">
                    No orders found.
                    <Link href="/dashboard/customer/order" className="block mt-2 text-green-600 hover:underline">Place an order →</Link>
                  </div>
                ) : filtered.map(r => {
                  const isSelected = selectedRequest?.id === r.id;
                  const color = getStatusColor(r.status);
                  return (
                    <button key={r.id} onClick={() => setSelectedRequest(r)}
                      className={`w-full text-left p-4 border-b border-gray-50 transition-colors hover:bg-gray-50 ${isSelected ? 'bg-green-50 border-l-4 border-l-green-500' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{displayName(r)}</p>
                          <p className="text-gray-400 text-xs mt-0.5">#{r.request_id}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0"
                          style={{ color, backgroundColor: color + '20' }}>
                          {formatStatus(r.status)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Tracking Detail */}
          <div className="lg:col-span-2">
            {!selectedRequest ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-64">
                <p className="text-gray-400">Select an order to view tracking</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b" style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white/80 text-xs font-medium">Order #{selectedRequest.request_id}</p>
                      <p className="text-white font-bold text-lg mt-0.5">{displayName(selectedRequest)}</p>
                      {selectedRequest.location && <p className="text-white/70 text-xs mt-1">📍 {selectedRequest.location}</p>}
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                      {formatStatus(selectedRequest.status)}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  {/* Status Timeline */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Order Progress</h4>
                    <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                      {steps.map((step, i) => {
                        const stepIdx = getStatusOrder(step.key);
                        let isDone = false;
                        let isPartiallyCompleted = false;
                        const isCurrent = stepIdx === currentStepIdx;
                        const isUpcoming = stepIdx > currentStepIdx;
                        
                        let hintText = '';
                        if (selectedRequest.service_category !== 'service' && selectedRequest.items && selectedRequest.items.length > 0) {
                          const totalItemsCount = selectedRequest.items.length;
                          if (step.key === 'on_delivery') {
                            const cumulativeStatuses = ['loaded', 'delivered', 'ready_to_pickup', 'picked_up', 'completed'];
                            const reachedCount = selectedRequest.items.filter(item => cumulativeStatuses.includes(item.status || '')).length;
                            isDone = reachedCount === totalItemsCount;
                            isPartiallyCompleted = reachedCount > 0 && reachedCount < totalItemsCount;
                            if (reachedCount > 0) hintText = `(${reachedCount}/${totalItemsCount} loaded)`;
                          } else if (step.key === 'delivered') {
                            const cumulativeStatuses = ['delivered', 'ready_to_pickup', 'picked_up', 'completed'];
                            const reachedCount = selectedRequest.items.filter(item => cumulativeStatuses.includes(item.status || '')).length;
                            isDone = reachedCount === totalItemsCount;
                            isPartiallyCompleted = reachedCount > 0 && reachedCount < totalItemsCount;
                            if (reachedCount > 0) hintText = `(${reachedCount}/${totalItemsCount} delivered)`;
                          } else if (step.key === 'ready_to_pickup') {
                            const cumulativeStatuses = ['ready_to_pickup', 'picked_up', 'completed'];
                            const reachedCount = selectedRequest.items.filter(item => cumulativeStatuses.includes(item.status || '')).length;
                            isDone = reachedCount === totalItemsCount;
                            isPartiallyCompleted = reachedCount > 0 && reachedCount < totalItemsCount;
                            if (reachedCount > 0) hintText = `(${reachedCount}/${totalItemsCount} ready)`;
                          } else if (step.key === 'pickup') {
                            const cumulativeStatuses = ['picked_up', 'completed'];
                            const reachedCount = selectedRequest.items.filter(item => cumulativeStatuses.includes(item.status || '')).length;
                            isDone = reachedCount === totalItemsCount;
                            isPartiallyCompleted = reachedCount > 0 && reachedCount < totalItemsCount;
                            if (reachedCount > 0) hintText = `(${reachedCount}/${totalItemsCount} picked up)`;
                          } else {
                            isDone = stepIdx <= currentStepIdx && !isCurrent;
                          }
                        } else {
                          isDone = stepIdx <= currentStepIdx && !isCurrent;
                        }

                        return (
                          <div key={step.key} className="flex gap-4 items-start relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border shadow-sm ${
                              isDone ? 'bg-emerald-500 border-emerald-600 text-white' :
                              isPartiallyCompleted ? 'bg-purple-500 border-purple-600 text-white animate-pulse' :
                              isCurrent ? 'border-emerald-500 bg-emerald-50 text-emerald-600' :
                              'bg-white border-gray-300 text-gray-400'
                            }`}>
                              {isDone ? '✓' : step.icon}
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${isCurrent ? 'text-emerald-600' : isDone ? 'text-gray-800' : 'text-gray-400'}`}>
                                {step.label}
                              </p>
                              {hintText && <p className="text-xs text-emerald-600 font-semibold">{hintText}</p>}
                              {isCurrent && <p className="text-xs text-emerald-500 mt-0.5">● Current Status</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Order Details</h4>
                    <div className="space-y-2">
                      {[
                        { label: 'Total Amount', value: formatPrice(selectedRequest.total_price || selectedRequest.estimated_price) },
                        formatDateRange(selectedRequest.start_date, selectedRequest.end_date) && { label: 'Dates', value: formatDateRange(selectedRequest.start_date, selectedRequest.end_date) },
                        selectedRequest.duration_days && { label: 'Duration', value: `${selectedRequest.duration_days} day(s)` },
                        selectedRequest.gst_rate && { label: `GST (${selectedRequest.gst_rate}%)`, value: formatPrice(selectedRequest.gst_amount) },
                        { label: 'Payment', value: `${selectedRequest.payment_method || 'N/A'} · ${selectedRequest.payment_status || 'pending'}` },
                        selectedRequest.supplier_name && { label: 'Supplier', value: selectedRequest.supplier_name },
                        selectedRequest.contact_number && { label: 'Contact', value: selectedRequest.contact_number },
                        selectedRequest.instructions && { label: 'Instructions', value: selectedRequest.instructions },
                      ].filter(Boolean).map((row: any) => (
                        <div key={row.label} className="flex justify-between text-sm py-1.5 border-b border-gray-50">
                          <span className="text-gray-500">{row.label}</span>
                          <span className="text-gray-900 font-medium text-right max-w-[60%]">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bins Status */}
                  {selectedRequest.service_category !== 'service' && selectedRequest.items && selectedRequest.items.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Bins Status</h4>
                      <div className="space-y-3">
                        {selectedRequest.items.map((item, idx) => {
                          const itemColor = getStatusColor(item.status || 'pending');
                          return (
                            <div key={item.id || idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                              <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
                                <div>
                                  <p className="font-medium text-gray-900">• {item.bin_type_name} {item.bin_size ? `(${item.bin_size})` : ''}</p>
                                  {item.bin_code && <p className="text-sm text-gray-500 mt-1">Assigned Bin: <span className="font-semibold text-gray-700">{item.bin_code}</span></p>}
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold shrink-0" style={{ color: itemColor, backgroundColor: itemColor + '20' }}>
                                  {formatStatus(item.status || 'pending')}
                                </span>
                              </div>
                              {/* Per-bin Mark Ready for Pickup button */}
                              {item.status === 'delivered' && (
                                <button
                                  onClick={() => handleSingleBinMarkReady(item.id)}
                                  disabled={markingReady === item.id}
                                  className="mt-3 w-full py-2 text-sm font-semibold rounded-lg text-white transition-all"
                                  style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)', opacity: markingReady === item.id ? 0.7 : 1 }}
                                >
                                  {markingReady === item.id ? 'Updating...' : '🔄 Mark Ready for Pickup'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Attachments */}
                  {getAttachments(selectedRequest).length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Attachments</h4>
                      <div className="flex gap-2 flex-wrap">
                        {getAttachments(selectedRequest).map((img, i) => (
                          <a key={i} href={`${API_BASE_URL}${img}`} target="_blank" rel="noreferrer">
                            <img src={`${API_BASE_URL}${img}`} alt="" className="h-20 w-20 object-cover rounded-xl border-2 border-gray-100 hover:border-green-400 transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-5 border-t pt-4">
                    {selectedRequest.status === 'awaiting_payment' && selectedRequest.payment_method === 'online' && (
                      <button onClick={handlePayNow} disabled={paying}
                        className="flex-1 py-3 text-white font-semibold rounded-xl transition-all"
                        style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}>
                        {paying ? 'Processing...' : '💳 Pay Now'}
                      </button>
                    )}
                    {selectedRequest.status !== 'completed' && selectedRequest.status !== 'cancelled' && (
                      <button onClick={handleCancel} disabled={cancelling}
                        className="px-5 py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors">
                        {cancelling ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                    <Link href="/dashboard/customer/bookings"
                      className="px-5 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors text-center">
                      All Orders
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerTrackingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>}>
      <TrackingContent />
    </Suspense>
  );
}
