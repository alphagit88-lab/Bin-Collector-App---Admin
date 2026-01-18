'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface BinType {
  id: number;
  name: string;
}

interface BinSize {
  id: number;
  bin_type_id: number;
  size: string;
  capacity_cubic_meters: number;
}

interface OrderBin {
  bin_type_id: string;
  bin_size_id: string;
  quantity: number;
}

export default function CustomerOrderPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [binTypes, setBinTypes] = useState<BinType[]>([]);
  const [binSizesMap, setBinSizesMap] = useState<Record<number, BinSize[]>>({});
  const [loading, setLoading] = useState(false);
  const [bins, setBins] = useState<OrderBin[]>([{ bin_type_id: '', bin_size_id: '', quantity: 1 }]);
  const [formData, setFormData] = useState({
    service_category: 'residential',
    location: '',
    start_date: '',
    end_date: '',
    payment_method: 'online',
  });

  useEffect(() => {
    if (user?.role !== 'customer') {
      router.push('/dashboard');
      return;
    }
    fetchBinTypes();
  }, [user, router]);

  useEffect(() => {
    bins.forEach((bin) => {
      if (bin.bin_type_id && !binSizesMap[parseInt(bin.bin_type_id)]) {
        fetchBinSizes(parseInt(bin.bin_type_id));
      }
    });
  }, [bins]);

  const fetchBinTypes = async () => {
    const response = await api.get<{ binTypes: BinType[] }>('/bins/types');
    if (response.success && response.data) {
      setBinTypes(response.data.binTypes);
    }
  };

  const fetchBinSizes = async (binTypeId: number) => {
    const response = await api.get<{ binSizes: BinSize[] }>(`/bins/sizes?binTypeId=${binTypeId}`);
    if (response.success && response.data) {
      setBinSizesMap((prev) => ({ ...prev, [binTypeId]: response.data.binSizes }));
    }
  };

  const addBin = () => {
    setBins([...bins, { bin_type_id: '', bin_size_id: '', quantity: 1 }]);
  };

  const removeBin = (index: number) => {
    if (bins.length > 1) {
      setBins(bins.filter((_, i) => i !== index));
    }
  };

  const updateBin = (index: number, field: keyof OrderBin, value: string | number) => {
    const updated = [...bins];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'bin_type_id') {
      updated[index].bin_size_id = ''; // Reset size when type changes
    }
    setBins(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate submissions
    if (loading) {
      return;
    }
    
    // Validate bins
    const validBins = bins.filter(b => b.bin_type_id && b.bin_size_id);
    if (validBins.length === 0) {
      showToast('Please add at least one bin to your order', 'error');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        bins: validBins.map(b => ({
          bin_type_id: parseInt(b.bin_type_id),
          bin_size_id: parseInt(b.bin_size_id),
          quantity: b.quantity || 1,
        })),
      };

      console.log('Submitting order with bins:', payload.bins); // Debug log

      const response = await api.post('/bookings', payload);
      if (response.success) {
        console.log('Order created:', response.data); // Debug log
        showToast(`Order placed successfully with ${validBins.length} bin type(s)! Suppliers will be notified.`, 'success');
        router.push('/mobile/customer/orders');
      } else {
        showToast(response.message || 'Failed to place order', 'error');
      }
    } catch (error) {
      console.error('Order submission error:', error);
      showToast('Failed to place order', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      padding: '1rem',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Order a Bin</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Service Type *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, service_category: 'residential' })}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: formData.service_category === 'residential' ? '#10B981' : 'white',
                  color: formData.service_category === 'residential' ? 'white' : '#333',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Residential
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, service_category: 'commercial' })}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: formData.service_category === 'commercial' ? '#10B981' : 'white',
                  color: formData.service_category === 'commercial' ? 'white' : '#333',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Commercial
              </button>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 500 }}>Bins *</label>
              <button
                type="button"
                onClick={addBin}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                + Add Bin
              </button>
            </div>
            
            {bins.map((bin, index) => (
              <div key={index} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginBottom: '0.75rem',
                position: 'relative'
              }}>
                {bins.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBin(index)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: '#EF4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Bin Type *</label>
                    <select
                      value={bin.bin_type_id}
                      onChange={(e) => updateBin(index, 'bin_type_id', e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        fontSize: '0.875rem'
                      }}
                    >
                      <option value="">Select bin type</option>
                      {binTypes.map((type) => (
                        <option key={type.id} value={type.id}>{type.name}</option>
                      ))}
                    </select>
                  </div>

                  {bin.bin_type_id && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Bin Size *</label>
                      <select
                        value={bin.bin_size_id}
                        onChange={(e) => updateBin(index, 'bin_size_id', e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #ddd',
                          fontSize: '0.875rem'
                        }}
                      >
                        <option value="">Select bin size</option>
                        {binSizesMap[parseInt(bin.bin_type_id)]?.map((size) => (
                          <option key={size.id} value={size.id}>{size.size}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={bin.quantity}
                      onChange={(e) => updateBin(index, 'quantity', parseInt(e.target.value) || 1)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '6px',
                        border: '1px solid #ddd',
                        fontSize: '0.875rem'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Location *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter delivery address"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Start Date *</label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>End Date *</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              required
              min={formData.start_date || new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Payment Method *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: 'online' })}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: formData.payment_method === 'online' ? '#10B981' : 'white',
                  color: formData.payment_method === 'online' ? 'white' : '#333',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Online Payment
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, payment_method: 'cash' })}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: formData.payment_method === 'cash' ? '#10B981' : 'white',
                  color: formData.payment_method === 'cash' ? 'white' : '#333',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                Cash on Delivery
              </button>
            </div>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.5rem' }}>
              {formData.payment_method === 'online' 
                ? 'Payment will be processed when order is confirmed'
                : 'Payment will be collected when bin is delivered'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#10B981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>
      </div>
    </div>
  );
}
