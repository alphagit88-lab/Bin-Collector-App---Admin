'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api, API_BASE_URL } from '@/lib/api';

interface OrderItem {
  id: number;
  bin_type_name: string;
  bin_size: string;
  price?: string;
  status?: string;
  physical_bin_id?: number | null;
  bin_code?: string | null;
  physical_bin_status?: string | null;
  delivery_photo_url?: string | null;
}

interface StatusHistoryItem {
  id: number;
  status: string;
  notes?: string;
  created_at: string;
}

interface JobDetail {
  id: number;
  request_id: string;
  bin_type_name: string;
  bin_size: string;
  estimated_price: string;
  total_price?: string;
  start_date: string;
  end_date: string;
  location: string;
  customer_name: string;
  customer_phone?: string;
  customer_id?: number;
  status: string;
  payment_method?: string;
  payment_status?: string;
  status_history?: StatusHistoryItem[];
  orderItems?: OrderItem[];
  attachment_url?: string;
  latitude?: number | string;
  longitude?: number | string;
  delivery_photo_url?: string;
  service_category?: string;
  selected_services?: any;
  service_names?: string;
  selected_services_count?: number;
  driver_id?: number | string;
  driver_name?: string;
  supplier_id?: number | string;
  po_number?: string;
  additional_images?: string[] | string;
}

interface Driver {
  id: number;
  name: string;
  phone: string;
}

interface PhysicalBin {
  id: number;
  bin_code: string;
  bin_type_name: string;
  bin_size: string;
  status: string;
  bin_type_id: number;
  bin_size_id: number;
}

interface JobDetailModalProps {
  jobId: number;
  onClose: () => void;
  onJobUpdated?: () => void;
}

const statusSteps = [
  { key: 'pending', label: 'Pending', icon: '⏳' },
  { key: 'awaiting_payment', label: 'Awaiting Payment', icon: '💳' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅' },
  { key: 'on_delivery', label: 'On Delivery', icon: '🚚', isPhysical: true },
  { key: 'cash_collected', label: 'Cash Collected', icon: '💵', cashOnly: true },
  { key: 'delivered', label: 'Delivered', icon: '📦', isPhysical: true },
  { key: 'ready_to_pickup', label: 'Ready to Pickup', icon: '🔄', isPhysical: true },
  { key: 'pickup', label: 'Pickup', icon: '📥', isPhysical: true },
  { key: 'completed', label: 'Completed', icon: '🎉' },
];

export default function JobDetailModal({ jobId, onClose, onJobUpdated }: JobDetailModalProps) {
  const { showToast } = useToast();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [availableBins, setAvailableBins] = useState<PhysicalBin[]>([]);
  const [loadingBins, setLoadingBins] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Bin assignment modal states
  const [showBinAssignmentModal, setShowBinAssignmentModal] = useState(false);
  const [selectedItemForBin, setSelectedItemForBin] = useState<OrderItem | null>(null);
  const [binAssignments, setBinAssignments] = useState<Record<number, string>>({}); // orderItemId -> binCode

  // File Upload states for each OrderItem
  const [itemPhotos, setItemPhotos] = useState<Record<number, File>>({});
  const [itemPhotoPreviews, setItemPhotoPreviews] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchJobDetails();
    fetchDrivers();
    fetchAvailableBins();
  }, [jobId]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ request: JobDetail }>(`/bookings/${jobId}`);
      if (response.success && response.data?.request) {
        setJob(response.data.request);
        // Reset assignments map
        const initialAssignments: Record<number, string> = {};
        response.data.request.orderItems?.forEach(item => {
          if (item.bin_code) {
            initialAssignments[item.id] = item.bin_code;
          }
        });
        setBinAssignments(initialAssignments);
      } else {
        showToast('Failed to fetch job details', 'error');
      }
    } catch (err) {
      showToast('Error loading job details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const response = await api.get<{ drivers: Driver[] }>('/supplier/drivers');
      if (response.success && response.data?.drivers) {
        setDrivers(response.data.drivers);
      }
    } catch (err) {
      console.error('Error fetching drivers', err);
    }
  };

  const fetchAvailableBins = async () => {
    setLoadingBins(true);
    try {
      const response: any = await api.get<any>('/bins/physical?status=available');
      if (response.success) {
        setAvailableBins(response.bins || response.data?.bins || response.data || []);
      }
    } catch (err) {
      console.error('Error fetching available physical bins', err);
    } finally {
      setLoadingBins(false);
    }
  };

  const handleAssignDriver = async (driverId: number) => {
    setAssigningDriver(true);
    try {
      const response = await api.post('/supplier/assign-driver', {
        requestId: jobId,
        driverId: driverId
      });
      if (response.success) {
        showToast('Driver assigned successfully', 'success');
        fetchJobDetails();
        if (onJobUpdated) onJobUpdated();
      } else {
        showToast(response.message || 'Failed to assign driver', 'error');
      }
    } catch (error) {
      showToast('Error assigning driver', 'error');
    } finally {
      setAssigningDriver(false);
    }
  };

  const handleDeclineOrder = async () => {
    if (!confirm(`Are you sure you want to decline order #${job?.request_id}?`)) return;
    setUpdatingStatus(true);
    try {
      const response = await api.delete(`/bookings/${jobId}`);
      if (response.success) {
        showToast('Order declined successfully', 'success');
        onClose();
        if (onJobUpdated) onJobUpdated();
      } else {
        showToast(response.message || 'Failed to decline order', 'error');
      }
    } catch (error) {
      showToast('Error declining order', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAcceptOrder = async () => {
    if (!confirm(`Are you sure you want to accept order #${job?.request_id}?`)) return;
    setUpdatingStatus(true);
    try {
      const response = await api.post(`/bookings/${jobId}/accept`, {});
      if (response.success) {
        showToast('Order accepted successfully', 'success');
        fetchJobDetails();
        if (onJobUpdated) onJobUpdated();
      } else {
        showToast(response.message || 'Failed to accept order', 'error');
      }
    } catch (error) {
      showToast('Error accepting order', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setUpdatingStatus(true);
    try {
      const response = await api.delete(`/bookings/${jobId}`);
      if (response.success) {
        showToast('Order cancelled successfully', 'success');
        onClose();
        if (onJobUpdated) onJobUpdated();
      } else {
        showToast(response.message || 'Failed to cancel order', 'error');
      }
    } catch (error) {
      showToast('Error cancelling order', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleOverallStatusUpdate = async (newStatus: string, codes?: string[]) => {
    setUpdatingStatus(true);
    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      if (codes) {
        formData.append('bin_codes', JSON.stringify(codes));
      }
      const response = await api.put(`/bookings/${jobId}/status`, formData);
      if (response.success) {
        showToast(`Order status updated to ${formatStatus(newStatus)}`, 'success');
        setShowBinAssignmentModal(false);
        fetchJobDetails();
        if (onJobUpdated) onJobUpdated();
      } else {
        showToast(response.message || 'Failed to update order status', 'error');
      }
    } catch (err) {
      showToast('Error updating order status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleItemStatusUpdate = async (itemId: number, newStatus: string, binCode?: string | null) => {
    const itemPhoto = itemPhotos[itemId];
    if (newStatus === 'delivered' && !itemPhoto) {
      showToast('Please upload a delivery photo for this bin first', 'error');
      return;
    }
    
    setUpdatingStatus(true);
    try {
      const formData = new FormData();
      formData.append('status', newStatus);
      if (binCode) {
        formData.append('bin_code', binCode);
      }
      if (newStatus === 'delivered' && itemPhoto) {
        formData.append('delivery_photo', itemPhoto);
      }

      const response = await api.put(`/bookings/${jobId}/order-items/${itemId}/status`, formData);
      if (response.success) {
        showToast(`Bin status updated to ${formatStatus(newStatus)}`, 'success');
        
        // Reset local photo state for this item
        setItemPhotos(prev => {
          const u = { ...prev };
          delete u[itemId];
          return u;
        });
        setItemPhotoPreviews(prev => {
          const u = { ...prev };
          delete u[itemId];
          return u;
        });
        
        fetchJobDetails();
        if (onJobUpdated) onJobUpdated();
      } else {
        showToast(response.message || 'Failed to update bin status', 'error');
      }
    } catch (err) {
      showToast('Error updating bin status', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePhotoSelect = (itemId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setItemPhotos(prev => ({ ...prev, [itemId]: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setItemPhotoPreviews(prev => ({ ...prev, [itemId]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartDeliveryAll = () => {
    // Check if assignments are complete
    const items = job?.orderItems || [];
    const missing = items.filter(item => !binAssignments[item.id]);
    if (missing.length > 0) {
      showToast('Please assign physical bins to all items first', 'error');
      return;
    }
    const codes = items.map(item => binAssignments[item.id]);
    handleOverallStatusUpdate('on_delivery', codes);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'awaiting_payment': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'confirmed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'on_delivery':
      case 'loaded': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'ready_to_pickup': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'picked_up':
      case 'pickup': return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const parseAdditionalImages = (images: any): string[] => {
    if (!images) return [];
    if (Array.isArray(images)) return images;
    if (typeof images === 'string') {
      try {
        return JSON.parse(images);
      } catch (e) {
        return [images];
      }
    }
    return [];
  };

  const getCompatibleBins = (item: OrderItem) => {
    return availableBins.filter(bin => 
      bin.status === 'available' &&
      bin.bin_type_name === item.bin_type_name &&
      bin.bin_size === item.bin_size
    );
  };

  // Compile all attachments
  const attachments: string[] = [];
  if (job?.attachment_url) attachments.push(job.attachment_url);
  const additional = parseAdditionalImages(job?.additional_images);
  additional.forEach(img => {
    if (img && !attachments.includes(img)) attachments.push(img);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 lg:p-10 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative max-w-6xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-gray-100 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b flex justify-between items-center bg-gray-50/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-gray-950 tracking-tight">Job Detail View</h2>
              {job && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(job.status)}`}>
                  {formatStatus(job.status)}
                </span>
              )}
            </div>
            {job && <p className="text-sm text-gray-500 font-medium mt-1">Request ID: <span className="font-mono">{job.request_id}</span></p>}
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-all text-gray-400 hover:text-gray-900 hover:rotate-90 duration-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="flex-1 p-20 flex flex-col items-center justify-center bg-gray-50/50">
            <div className="w-12 h-12 border-4 rounded-full animate-spin border-[#10B981] border-t-transparent mb-4"></div>
            <p className="font-medium text-gray-500 text-sm">Loading job information...</p>
          </div>
        ) : !job ? (
          <div className="flex-1 p-20 text-center bg-gray-50/50">
            <p className="text-red-500 font-bold">Failed to load job details. Please try again.</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 bg-white p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column (Overview details) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Order Items Section */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Order Requirements ({job.orderItems?.length || 0})
                </h3>

                {job.service_category === 'service' ? (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Services Requested:</p>
                    <div className="flex flex-wrap gap-2">
                      {job.service_names ? (
                        job.service_names.split(',').map((name, idx) => (
                          <span key={idx} className="bg-green-50 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200 flex items-center">
                            <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5"></span>
                            {name.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="bg-green-50 text-green-800 text-xs font-semibold px-3 py-1.5 rounded-full border border-green-200">
                          General Service
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {job.orderItems?.map((item) => {
                      const showItemActions = job.status !== 'pending';
                      const preview = itemPhotoPreviews[item.id];
                      const compatibleBins = getCompatibleBins(item);

                      return (
                        <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-800 text-sm md:text-base">
                                {item.bin_type_name} ({item.bin_size})
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(item.status || 'pending')}`}>
                                {formatStatus(item.status || 'pending')}
                              </span>
                            </div>
                            
                            {item.bin_code && (
                              <p className="text-xs text-gray-600">
                                Assigned physical bin: <span className="font-bold font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{item.bin_code}</span>
                              </p>
                            )}

                            {item.delivery_photo_url && (
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-gray-500 mb-1">Delivery confirmation photo:</p>
                                <img
                                  src={`${API_BASE_URL}${item.delivery_photo_url}`}
                                  alt="Delivery confirmation"
                                  className="h-16 w-auto object-cover rounded-lg border border-gray-200 hover:scale-105 transition-transform cursor-pointer"
                                  onClick={() => window.open(`${API_BASE_URL}${item.delivery_photo_url}`, '_blank')}
                                />
                              </div>
                            )}
                          </div>

                          {/* Bin actions */}
                          {showItemActions && (
                            <div className="flex flex-col gap-2 min-w-[160px]">
                              {/* Loaded state update */}
                              {(item.status === 'pending' || item.status === 'confirmed' || !item.status) && (
                                <button
                                  onClick={() => {
                                    setSelectedItemForBin(item);
                                    setShowBinAssignmentModal(true);
                                  }}
                                  className="w-full text-center px-3 py-2 bg-gray-800 text-white rounded-lg text-xs font-bold hover:bg-black transition-all"
                                >
                                  {item.bin_code ? 'Change Bin Code' : 'Assign Bin & Load'}
                                </button>
                              )}

                              {/* Deliver bin action */}
                              {item.status === 'loaded' && (
                                <div className="space-y-2">
                                  {!preview ? (
                                    <label className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold cursor-pointer transition-all border border-gray-300 border-dashed">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                      </svg>
                                      Delivery Photo
                                      <input 
                                        type="file" 
                                        accept="image/*" 
                                        capture="environment"
                                        onChange={(e) => handlePhotoSelect(item.id, e)} 
                                        className="hidden" 
                                      />
                                    </label>
                                  ) : (
                                    <div className="flex flex-col gap-1 items-center">
                                      <img src={preview} alt="Preview" className="h-14 w-auto object-cover rounded border" />
                                      <div className="flex gap-1 w-full">
                                        <label className="flex-1 text-center py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-[10px] font-bold cursor-pointer">
                                          Retake
                                          <input type="file" accept="image/*" onChange={(e) => handlePhotoSelect(item.id, e)} className="hidden" />
                                        </label>
                                        <button
                                          onClick={() => handleItemStatusUpdate(item.id, 'delivered')}
                                          className="flex-1 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold"
                                        >
                                          Deliver
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Start pickup */}
                              {item.status === 'ready_to_pickup' && (
                                <button
                                  onClick={() => handleItemStatusUpdate(item.id, 'pickup')}
                                  className="w-full text-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  Start Pickup
                                </button>
                              )}

                              {/* Complete pickup */}
                              {(item.status === 'picked_up' || item.status === 'pickup') && (
                                <button
                                  onClick={() => handleItemStatusUpdate(item.id, 'completed')}
                                  className="w-full text-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all"
                                >
                                  Complete Pickup
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Customer Details */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Customer Information
                </h3>
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-gray-900">{job.customer_name}</h4>
                    {job.customer_phone && <p className="text-sm text-gray-600 font-mono mt-0.5">{job.customer_phone}</p>}
                  </div>
                  
                  {job.status !== 'pending' && (
                    <div className="flex items-center gap-2">
                      {job.customer_phone && (
                        <a 
                          href={`tel:${job.customer_phone}`} 
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          Call Client
                        </a>
                      )}
                      
                      <button
                        onClick={async () => {
                          try {
                            const recipientId = job.customer_id;
                            if (!recipientId) return;
                            const response = await api.post<{ id: number }>('/messages/start-order-chat', {
                              orderId: job.id,
                              recipientId: recipientId
                            });
                            if (response.success && response.data) {
                              window.location.href = `/dashboard/notifications`; // simple redirect or chat trigger
                            }
                          } catch (err) {
                            showToast('Failed to start chat', 'error');
                          }
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Selection details */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Job Location
                  </h3>
                  <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-0.5"
                  >
                    Get Directions
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
                <p className="text-sm text-gray-700 bg-white p-3 rounded-xl border border-gray-200">{job.location}</p>
              </div>

              {/* Date Schedule details */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Service Schedule
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-400 font-semibold uppercase">Delivery Date</p>
                    <p className="text-sm md:text-base font-bold text-gray-800 mt-1">{formatDate(job.start_date)}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <p className="text-xs text-gray-400 font-semibold uppercase">Pickup Date</p>
                    <p className="text-sm md:text-base font-bold text-gray-800 mt-1">{formatDate(job.end_date)}</p>
                  </div>
                </div>
              </div>

              {/* Attachments view */}
              {attachments.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Attachments ({attachments.length})</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                    {attachments.map((img, idx) => (
                      <div key={idx} className="flex-shrink-0 relative group">
                        <img 
                          src={`${API_BASE_URL}${img}`}
                          alt={`Attachment ${idx + 1}`}
                          className="h-24 w-32 object-cover rounded-xl border border-gray-200 shadow-sm cursor-zoom-in hover:opacity-95 transition-opacity"
                          onClick={() => window.open(`${API_BASE_URL}${img}`, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Right Column (Timeline & Actions) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Job Actions */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  Operations Panel
                </h3>

                <div className="space-y-4">
                  
                  {/* Pending State (Accept/Decline) */}
                  {job.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={handleDeclineOrder}
                        disabled={updatingStatus}
                        className="py-3 px-4 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-sm transition-all border border-red-200 shadow-sm"
                      >
                        Decline Job
                      </button>
                      <button
                        onClick={handleAcceptOrder}
                        disabled={updatingStatus}
                        className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        Accept Job
                      </button>
                    </div>
                  )}

                  {/* Confirmed State actions */}
                  {job.status === 'confirmed' && (
                    <div className="space-y-3">
                      {job.service_category === 'service' ? (
                        <button
                          onClick={() => {
                            if (job.payment_method === 'cash') {
                              if (confirm('Confirm cash collection and complete this service?')) {
                                handleOverallStatusUpdate('cash_collected');
                              }
                            } else {
                              if (confirm('Mark this service as completed?')) {
                                handleOverallStatusUpdate('completed');
                              }
                            }
                          }}
                          disabled={updatingStatus}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-95"
                        >
                          {job.payment_method === 'cash' ? 'Collect Cash & Complete' : 'Mark Completed'}
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedItemForBin(null);
                            setShowBinAssignmentModal(true);
                          }}
                          disabled={updatingStatus}
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all active:scale-95"
                        >
                          Start Delivery (Assign Bins)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Completed and Cash collected states for services */}
                  {job.service_category === 'service' && job.status === 'cash_collected' && (
                    <button
                      onClick={() => {
                        if (confirm('Mark this service as fully completed?')) {
                          handleOverallStatusUpdate('completed');
                        }
                      }}
                      disabled={updatingStatus}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-all"
                    >
                      Complete Job
                    </button>
                  )}

                  {/* Cash Collected button for Bins */}
                  {job.service_category !== 'service' &&
                    job.payment_method === 'cash' &&
                    job.status !== 'cash_collected' &&
                    job.payment_status !== 'paid' &&
                    job.status !== 'pending' &&
                    job.orderItems?.some(item =>
                      ['delivered', 'ready_to_pickup', 'picked_up', 'completed'].includes(item.status || '')
                    ) && (
                      <button
                        onClick={() => {
                          if (confirm('Confirm that cash has been collected from the customer?')) {
                            handleOverallStatusUpdate('cash_collected');
                          }
                        }}
                        disabled={updatingStatus}
                        className="w-full py-3 bg-[#10B981] hover:bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-md transition-all"
                      >
                        Mark Cash Collected
                      </button>
                    )}

                  {/* Driver Assignment Section */}
                  {job.status !== 'pending' && job.status !== 'completed' && job.status !== 'cancelled' && (
                    <div className="pt-2 border-t border-gray-200/80">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Driver Assignment</p>
                      {job.driver_id ? (
                        <div className="bg-white p-3 rounded-xl border border-gray-200 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-bold text-gray-800">{job.driver_name || 'Assigned Driver'}</p>
                          </div>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignDriver(parseInt(e.target.value));
                              }
                            }}
                            disabled={assigningDriver}
                            className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 outline-none cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Change Driver</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex flex-col gap-2">
                          <p className="text-xs text-amber-800 font-semibold">No driver assigned to this job yet.</p>
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleAssignDriver(parseInt(e.target.value));
                              }
                            }}
                            disabled={assigningDriver}
                            className="w-full px-3 py-2 bg-white rounded-lg border border-amber-200 text-xs font-semibold outline-none cursor-pointer text-gray-800"
                            defaultValue=""
                          >
                            <option value="" disabled>Select Driver to Assign</option>
                            {drivers.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cancel Order (Suppliers only) */}
                  {job.status !== 'pending' && job.status !== 'completed' && job.status !== 'cancelled' && (
                    <div className="pt-2 border-t border-gray-200/80">
                      <button
                        onClick={handleCancelOrder}
                        disabled={updatingStatus}
                        className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 font-bold rounded-xl text-xs transition-all"
                      >
                        Cancel Entire Order
                      </button>
                    </div>
                  )}

                </div>
              </div>

              {/* Price Details Card */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Invoice & Payments
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm border-b pb-2 border-gray-200">
                    <span className="text-gray-500 font-medium">Estimated Price:</span>
                    <span className="font-bold text-gray-900">${job.estimated_price || job.total_price || '0.00'}</span>
                  </div>
                  {job.po_number && (
                    <div className="flex justify-between items-center text-sm border-b pb-2 border-gray-200">
                      <span className="text-gray-500 font-medium">PO Number:</span>
                      <span className="font-semibold font-mono text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">{job.po_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm border-b pb-2 border-gray-200">
                    <span className="text-gray-500 font-medium">Payment Mode:</span>
                    <span className="font-bold text-gray-700 uppercase">{job.payment_method || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 font-medium">Payment Status:</span>
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                      job.payment_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {job.payment_status?.toUpperCase() || 'UNPAID'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              {job.status !== 'pending' && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Status Timeline</h3>
                  <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                    {statusSteps
                      .filter(step => {
                        if (step.cashOnly && job.payment_method !== 'cash') return false;
                        if (step.key === 'awaiting_payment' && job.payment_method === 'cash') return false;
                        if (job.service_category === 'service' && step.isPhysical) return false;
                        return true;
                      })
                      .map((step, idx, filtered) => {
                        const currentIndex = filtered.findIndex(s => s.key === job.status);
                        
                        let isCompleted = false;
                        let isPartiallyCompleted = false;
                        let hintText = '';
                        const totalCount = job.orderItems?.length || 0;

                        if (step.key === 'cash_collected') {
                          isCompleted = job.payment_status === 'paid' || 
                            job.status === 'cash_collected' ||
                            (job.status_history?.some(h => h.status === 'cash_collected') || false);
                        } else if (job.service_category !== 'service' && totalCount > 0) {
                          const items = job.orderItems || [];
                          if (step.key === 'on_delivery') {
                            const reached = items.filter(i => ['loaded', 'cash_collected', 'delivered', 'ready_to_pickup', 'picked_up', 'completed'].includes(i.status || '')).length;
                            isCompleted = reached === totalCount;
                            isPartiallyCompleted = reached > 0 && reached < totalCount;
                            if (reached > 0) hintText = `(${reached}/${totalCount} loaded)`;
                          } else if (step.key === 'delivered') {
                            const reached = items.filter(i => ['delivered', 'ready_to_pickup', 'picked_up', 'completed'].includes(i.status || '')).length;
                            isCompleted = reached === totalCount;
                            isPartiallyCompleted = reached > 0 && reached < totalCount;
                            if (reached > 0) hintText = `(${reached}/${totalCount} delivered)`;
                          } else if (step.key === 'ready_to_pickup') {
                            const reached = items.filter(i => ['ready_to_pickup', 'picked_up', 'completed'].includes(i.status || '')).length;
                            isCompleted = reached === totalCount;
                            isPartiallyCompleted = reached > 0 && reached < totalCount;
                            if (reached > 0) hintText = `(${reached}/${totalCount} ready)`;
                          } else if (step.key === 'pickup') {
                            const reached = items.filter(i => ['picked_up', 'completed'].includes(i.status || '')).length;
                            isCompleted = reached === totalCount;
                            isPartiallyCompleted = reached > 0 && reached < totalCount;
                            if (reached > 0) hintText = `(${reached}/${totalCount} picked up)`;
                          } else {
                            isCompleted = idx <= currentIndex;
                          }
                        } else {
                          isCompleted = idx <= currentIndex;
                        }

                        const isCurrent = idx === currentIndex;

                        return (
                          <div key={step.key} className="flex gap-4 items-start relative z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border shadow-sm ${
                              isCompleted ? 'bg-emerald-500 border-emerald-600 text-white' :
                              isPartiallyCompleted ? 'bg-purple-500 border-purple-600 text-white animate-pulse' :
                              'bg-white border-gray-300 text-gray-400'
                            }`}>
                              {isCompleted ? '✓' : step.icon}
                            </div>
                            <div>
                              <p className={`text-sm font-bold ${isCurrent ? 'text-emerald-600' : isCompleted ? 'text-gray-800' : 'text-gray-400'}`}>
                                {step.label}
                              </p>
                              {hintText && <p className="text-xs text-emerald-600 font-semibold">{hintText}</p>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* Bin Assignment Sub-Modal */}
      {showBinAssignmentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-gray-100 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-black text-gray-900">
                {selectedItemForBin ? 'Assign Physical Bin' : 'Assign All Physical Bins'}
              </h4>
              <button 
                onClick={() => {
                  setShowBinAssignmentModal(false);
                  setSelectedItemForBin(null);
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Assign physical code from available inventory matching type and size to load bin onto delivery truck.
            </p>

            <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6">
              {(selectedItemForBin ? [selectedItemForBin] : (job?.orderItems || [])).map(item => {
                const compatible = getCompatibleBins(item);
                
                return (
                  <div key={item.id} className="p-3 bg-gray-50 border rounded-xl flex flex-col gap-2">
                    <p className="text-xs font-bold text-gray-700">{item.bin_type_name} ({item.bin_size})</p>
                    <select
                      value={binAssignments[item.id] || ''}
                      onChange={(e) => {
                        setBinAssignments(prev => ({
                          ...prev,
                          [item.id]: e.target.value
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white rounded-lg border border-gray-300 text-sm outline-none cursor-pointer"
                    >
                      <option value="">-- Choose Bin Code --</option>
                      {compatible.map(b => (
                        <option 
                          key={b.id} 
                          value={b.bin_code}
                          disabled={Object.entries(binAssignments).some(([id, code]) => parseInt(id) !== item.id && code === b.bin_code)}
                        >
                          {b.bin_code}
                        </option>
                      ))}
                    </select>
                    {compatible.length === 0 && (
                      <p className="text-[10px] text-red-500 font-semibold">No available bins in inventory of this category.</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowBinAssignmentModal(false);
                  setSelectedItemForBin(null);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (selectedItemForBin) {
                    const assignedCode = binAssignments[selectedItemForBin.id];
                    if (!assignedCode) {
                      showToast('Please select a bin code', 'error');
                      return;
                    }
                    await handleItemStatusUpdate(selectedItemForBin.id, 'loaded', assignedCode);
                    setShowBinAssignmentModal(false);
                    setSelectedItemForBin(null);
                  } else {
                    handleStartDeliveryAll();
                  }
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-md"
              >
                {selectedItemForBin ? 'Save Assignment' : 'Start Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
