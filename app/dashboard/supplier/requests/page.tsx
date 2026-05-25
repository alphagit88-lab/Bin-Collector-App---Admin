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
  created_at: string;
  order_items_count?: number;
  attachment_url?: string;
  additional_images?: string[] | string;
  delivery_photo_url?: string;
}

export default function SupplierRequestsPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttachments, setSelectedAttachments] = useState<string[] | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ requests: ServiceRequest[] }>('/bookings/supplier/pending');
      if (response.success && response.data) {
        setRequests(response.data.requests);
      } else {
        showToast('Failed to fetch pending requests', 'error');
      }
    } catch (error) {
      showToast('Failed to fetch pending requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (id: number) => {
    if (!confirm('Are you sure you want to accept this request?')) return;
    try {
      const response = await api.post(`/bookings/${id}/accept`, {});
      if (response.success) {
        showToast('Request accepted successfully', 'success');
        fetchRequests(); // Refresh list
      } else {
        showToast(response.error || 'Failed to accept request', 'error');
      }
    } catch (error) {
      showToast('Failed to accept request', 'error');
    }
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Pending Requests</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>View and accept pending service requests</p>
        </div>

        {/* Requests Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Customer</th>
                <th>Bin Details</th>
                <th>Location</th>
                <th>Dates</th>
                <th>Attachments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No pending requests found
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {req.request_id}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>{req.customer_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                          {req.customer_phone}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 500 }}>
                          {req.bin_type_name} - {req.bin_size}
                          {req.order_items_count && req.order_items_count > 1 && (
                            <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400, marginLeft: '0.5rem' }}>
                              + more {req.order_items_count - 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {req.location}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>{formatDate(req.start_date)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        to {formatDate(req.end_date)}
                      </div>
                    </td>
                    <td>
                      {(() => {
                        let images: string[] = [];
                        if (req.attachment_url) images.push(req.attachment_url);
                        if (req.additional_images) {
                          let parsed: string[] = [];
                          if (Array.isArray(req.additional_images)) parsed = req.additional_images;
                          else if (typeof req.additional_images === 'string') {
                            try { parsed = JSON.parse(req.additional_images); } catch(e) {}
                          }
                          images = [...images, ...parsed];
                        }
                        if (req.delivery_photo_url) images.push(req.delivery_photo_url);
                        
                        return images.length > 0 ? (
                          <button
                            onClick={() => setSelectedAttachments(images)}
                            className="cursor-pointer hover:underline"
                            style={{
                              color: '#10B981',
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              fontWeight: 500,
                              textAlign: 'left'
                            }}
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
                        onClick={() => handleAcceptRequest(req.id)}
                        className="btn btn-primary btn-sm"
                      >
                        Accept
                      </button>
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
