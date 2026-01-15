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

export default function CustomerOrderPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [binTypes, setBinTypes] = useState<BinType[]>([]);
  const [binSizes, setBinSizes] = useState<BinSize[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    service_category: 'residential',
    bin_type_id: '',
    bin_size_id: '',
    location: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    if (user?.role !== 'customer') {
      router.push('/dashboard');
      return;
    }
    fetchBinTypes();
  }, [user, router]);

  useEffect(() => {
    if (formData.bin_type_id) {
      fetchBinSizes(parseInt(formData.bin_type_id));
    } else {
      setBinSizes([]);
    }
  }, [formData.bin_type_id]);

  const fetchBinTypes = async () => {
    const response = await api.get<{ binTypes: BinType[] }>('/bins/types');
    if (response.success && response.data) {
      setBinTypes(response.data.binTypes);
    }
  };

  const fetchBinSizes = async (binTypeId: number) => {
    const response = await api.get<{ binSizes: BinSize[] }>(`/bins/sizes?binTypeId=${binTypeId}`);
    if (response.success && response.data) {
      setBinSizes(response.data.binSizes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/bookings', formData);
      if (response.success) {
        showToast('Order placed successfully! Waiting for supplier quotes...', 'success');
        router.push('/mobile/customer/orders');
      } else {
        showToast(response.message || 'Failed to place order', 'error');
      }
    } catch (error) {
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Bin Type *</label>
            <select
              value={formData.bin_type_id}
              onChange={(e) => setFormData({ ...formData, bin_type_id: e.target.value, bin_size_id: '' })}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '1rem'
              }}
            >
              <option value="">Select bin type</option>
              {binTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          {formData.bin_type_id && (
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Bin Size *</label>
              <select
                value={formData.bin_size_id}
                onChange={(e) => setFormData({ ...formData, bin_size_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '1rem'
                }}
              >
                <option value="">Select bin size</option>
                {binSizes.map((size) => (
                  <option key={size.id} value={size.id}>{size.size}</option>
                ))}
              </select>
            </div>
          )}

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
