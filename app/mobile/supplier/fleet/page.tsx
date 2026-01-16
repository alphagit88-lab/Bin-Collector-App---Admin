'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Bin {
  id: number;
  bin_code: string;
  bin_type_name: string;
  bin_size: string;
  status: string;
  current_customer_name?: string;
  current_service_request_id?: number;
  notes?: string;
}

interface BinType {
  id: number;
  name: string;
}

interface BinSize {
  id: number;
  size: string;
  bin_type_id: number;
}

export default function SupplierFleetPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [bins, setBins] = useState<Bin[]>([]);
  const [binTypes, setBinTypes] = useState<BinType[]>([]);
  const [binSizes, setBinSizes] = useState<BinSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [formData, setFormData] = useState({
    bin_code: '',
    bin_type_id: '',
    bin_size_id: '',
    notes: '',
  });

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user, router, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const [binsRes, typesRes] = await Promise.all([
        api.get<{ bins: Bin[] }>(`/bins/physical${params}`),
        api.get<{ binTypes: BinType[] }>('/bins/types'),
      ]);

      if (binsRes.success) {
        // Backend returns: { success: true, bins: [...] }
        const bins = binsRes.bins || binsRes.data?.bins || [];
        setBins(bins);
      } else {
        console.error('Failed to fetch bins:', binsRes);
      }

      if (typesRes.success && typesRes.data) {
        setBinTypes(typesRes.data.binTypes);
      }
    } catch (error) {
      showToast('Failed to load fleet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.bin_type_id) {
      fetchBinSizes(parseInt(formData.bin_type_id));
    } else {
      setBinSizes([]);
    }
  }, [formData.bin_type_id]);

  const fetchBinSizes = async (binTypeId: number) => {
    const response = await api.get<{ binSizes: BinSize[] }>(`/bins/sizes?binTypeId=${binTypeId}`);
    if (response.success && response.data) {
      setBinSizes(response.data.binSizes);
    }
  };

  const handleAddBin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/bins/physical', {
        bin_type_id: parseInt(formData.bin_type_id),
        bin_size_id: parseInt(formData.bin_size_id),
        notes: formData.notes || undefined,
      });

      if (response.success) {
        showToast('Bin added successfully!', 'success');
        setShowAddModal(false);
        setFormData({ bin_code: '', bin_type_id: '', bin_size_id: '', notes: '' });
        fetchData();
      } else {
        showToast(response.message || 'Failed to add bin', 'error');
      }
    } catch (error) {
      showToast('Failed to add bin', 'error');
    }
  };

  const handleUpdateStatus = async (binId: number, newStatus: string) => {
    try {
      const response = await api.put(`/bins/physical/${binId}`, { status: newStatus });
      if (response.success) {
        showToast('Bin status updated', 'success');
        fetchData();
      } else {
        showToast(response.message || 'Failed to update status', 'error');
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'confirmed': return '#3B82F6';
      case 'loaded': return '#6366F1';
      case 'delivered': return '#8B5CF6';
      case 'ready_to_pickup': return '#EC4899';
      case 'picked_up': return '#14B8A6';
      case 'unavailable': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>Fleet Management</h1>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            + Add Bin
          </button>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
          {['all', 'available', 'confirmed', 'loaded', 'delivered', 'ready_to_pickup', 'picked_up', 'unavailable'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 16px',
                backgroundColor: filterStatus === status ? '#3B82F6' : 'white',
                color: filterStatus === status ? 'white' : '#6B7280',
                border: '1px solid #E5E7EB',
                borderRadius: '20px',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {status === 'all' ? 'All' : formatStatus(status)}
            </button>
          ))}
        </div>

        {/* Bins List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bins.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🚛</div>
              <div style={{ color: '#6B7280' }}>No bins found</div>
            </div>
          ) : (
            bins.map((bin) => (
              <div
                key={bin.id}
                style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                      {bin.bin_code}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                      {bin.bin_type_name} - {bin.bin_size}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    backgroundColor: getStatusColor(bin.status) + '20',
                    color: getStatusColor(bin.status)
                  }}>
                    {formatStatus(bin.status)}
                  </div>
                </div>

                {bin.current_customer_name && (
                  <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '8px' }}>
                    Customer: {bin.current_customer_name}
                  </div>
                )}

                {bin.notes && (
                  <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '8px' }}>
                    {bin.notes}
                  </div>
                )}

                {/* Status Update Buttons */}
                {bin.status === 'available' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => handleUpdateStatus(bin.id, 'unavailable')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#EF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Mark Unavailable
                    </button>
                  </div>
                )}

                {bin.status === 'unavailable' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button
                      onClick={() => handleUpdateStatus(bin.id, 'available')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      Mark Available
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Bin Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '100%',
              maxWidth: '400px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>Add New Bin</h2>
            <form onSubmit={handleAddBin}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>
                  Bin Type
                </label>
                <select
                  required
                  value={formData.bin_type_id}
                  onChange={(e) => setFormData({ ...formData, bin_type_id: e.target.value, bin_size_id: '' })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select bin type</option>
                  {binTypes.map(type => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>
                  Bin Size
                </label>
                <select
                  required
                  value={formData.bin_size_id}
                  onChange={(e) => setFormData({ ...formData, bin_size_id: e.target.value })}
                  disabled={!formData.bin_type_id}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.875rem',
                    opacity: formData.bin_type_id ? 1 : 0.5
                  }}
                >
                  <option value="">Select bin size</option>
                  {binSizes.map(size => (
                    <option key={size.id} value={size.id}>{size.size}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '0.875rem',
                    minHeight: '80px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#F3F4F6',
                    color: '#111827',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '12px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Add Bin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
