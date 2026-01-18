'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface BinType {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  display_order: number;
}

interface BinSize {
  id: number;
  bin_type_id: number;
  bin_type_name: string;
  size: string;
  capacity_cubic_meters: number;
  is_active: boolean;
  display_order: number;
}

interface PhysicalBin {
  id: number;
  bin_code: string;
  bin_type_name: string;
  bin_size: string;
  capacity_cubic_meters: number;
  supplier_name?: string;
  supplier_phone?: string;
  customer_name?: string;
  customer_phone?: string;
  status: string;
  request_id?: string;
  current_location?: string;
  notes?: string;
}

export default function BinsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'types' | 'sizes'>('types');
  const [binTypes, setBinTypes] = useState<BinType[]>([]);
  const [binSizes, setBinSizes] = useState<BinSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [editingType, setEditingType] = useState<BinType | null>(null);
  const [editingSize, setEditingSize] = useState<BinSize | null>(null);
  const [typeFormData, setTypeFormData] = useState({
    name: '',
    description: '',
    display_order: 0,
    is_active: true,
  });
  const [sizeFormData, setSizeFormData] = useState({
    bin_type_id: '',
    size: '',
    capacity_cubic_meters: '',
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesResponse, sizesResponse] = await Promise.all([
        api.get<{ binTypes: BinType[] }>('/bins/types?includeInactive=true'),
        api.get<{ binSizes: BinSize[] }>('/bins/sizes?includeInactive=true'),
      ]);

      if (typesResponse.success && typesResponse.data) {
        setBinTypes(typesResponse.data.binTypes);
      }
      if (sizesResponse.success && sizesResponse.data) {
        setBinSizes(sizesResponse.data.binSizes);
      }
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    }
    setLoading(false);
  };

  const handleCreateType = () => {
    setEditingType(null);
    setTypeFormData({ name: '', description: '', display_order: 0, is_active: true });
    setShowTypeModal(true);
  };

  const handleEditType = (type: BinType) => {
    setEditingType(type);
    setTypeFormData({
      name: type.name,
      description: type.description || '',
      display_order: type.display_order,
      is_active: type.is_active,
    });
    setShowTypeModal(true);
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bin type?')) return;
    const response = await api.delete(`/bins/types/${id}`);
    if (response.success) {
      showToast('Bin type deleted successfully', 'success');
      fetchData();
    } else {
      showToast(response.message || 'Failed to delete bin type', 'error');
    }
  };

  const handleSubmitType = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...typeFormData,
      display_order: parseInt(String(typeFormData.display_order)),
    };

    if (editingType) {
      const response = await api.put(`/bins/types/${editingType.id}`, data);
      if (response.success) {
        showToast('Bin type updated successfully', 'success');
        setShowTypeModal(false);
        fetchData();
      } else {
        showToast(response.message || 'Failed to update bin type', 'error');
      }
    } else {
      const response = await api.post('/bins/types', data);
      if (response.success) {
        showToast('Bin type created successfully', 'success');
        setShowTypeModal(false);
        fetchData();
      } else {
        showToast(response.message || 'Failed to create bin type', 'error');
      }
    }
  };

  const handleCreateSize = () => {
    setEditingSize(null);
    setSizeFormData({ bin_type_id: '', size: '', capacity_cubic_meters: '', display_order: 0, is_active: true });
    setShowSizeModal(true);
  };

  const handleEditSize = (size: BinSize) => {
    setEditingSize(size);
    setSizeFormData({
      bin_type_id: String(size.bin_type_id),
      size: size.size,
      capacity_cubic_meters: String(size.capacity_cubic_meters),
      display_order: size.display_order,
      is_active: size.is_active,
    });
    setShowSizeModal(true);
  };

  const handleDeleteSize = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bin size?')) return;
    const response = await api.delete(`/bins/sizes/${id}`);
    if (response.success) {
      showToast('Bin size deleted successfully', 'success');
      fetchData();
    } else {
      showToast(response.message || 'Failed to delete bin size', 'error');
    }
  };

  const handleSubmitSize = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      bin_type_id: parseInt(sizeFormData.bin_type_id),
      size: sizeFormData.size,
      capacity_cubic_meters: parseFloat(sizeFormData.capacity_cubic_meters),
      display_order: parseInt(String(sizeFormData.display_order)),
      is_active: sizeFormData.is_active,
    };

    if (editingSize) {
      const response = await api.put(`/bins/sizes/${editingSize.id}`, data);
      if (response.success) {
        showToast('Bin size updated successfully', 'success');
        setShowSizeModal(false);
        fetchData();
      } else {
        showToast(response.message || 'Failed to update bin size', 'error');
      }
    } else {
      const response = await api.post('/bins/sizes', data);
      if (response.success) {
        showToast('Bin size created successfully', 'success');
        setShowSizeModal(false);
        fetchData();
      } else {
        showToast(response.message || 'Failed to create bin size', 'error');
      }
    }
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Bin Settings</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Manage bin types and sizes</p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)' }}>
          <button
            className={`px-4 py-2 font-medium cursor-pointer ${activeTab === 'types' ? 'border-b-2 border-[#10B981] text-[#10B981]' : 'text-gray-600'}`}
            onClick={() => setActiveTab('types')}
          >
            Bin Types
          </button>
          <button
            className={`px-4 py-2 font-medium cursor-pointer ${activeTab === 'sizes' ? 'border-b-2 border-[#10B981] text-[#10B981]' : 'text-gray-600'}`}
            onClick={() => setActiveTab('sizes')}
          >
            Bin Sizes
          </button>
        </div>

        {activeTab === 'types' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary cursor-pointer" onClick={handleCreateType}>
                + Add Bin Type
              </button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Display Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {binTypes.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                        No bin types found
                      </td>
                    </tr>
                  ) : (
                    binTypes.map((type) => (
                      <tr key={type.id}>
                        <td style={{ fontWeight: 500 }}>{type.name}</td>
                        <td>{type.description || '-'}</td>
                        <td>{type.display_order}</td>
                        <td>
                          <span className={`badge ${type.is_active ? 'badge-customer' : 'badge-supplier'}`}>
                            {type.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-outline btn-sm cursor-pointer"
                              onClick={() => handleEditType(type)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm cursor-pointer"
                              onClick={() => handleDeleteType(type.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'sizes' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn btn-primary cursor-pointer" onClick={handleCreateSize}>
                + Add Bin Size
              </button>
            </div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bin Type</th>
                    <th>Size</th>
                    <th>Capacity (m³)</th>
                    <th>Display Order</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {binSizes.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                        No bin sizes found
                      </td>
                    </tr>
                  ) : (
                    binSizes.map((size) => (
                      <tr key={size.id}>
                        <td style={{ fontWeight: 500 }}>{size.bin_type_name}</td>
                        <td>{size.size}</td>
                        <td>{size.capacity_cubic_meters}</td>
                        <td>{size.display_order}</td>
                        <td>
                          <span className={`badge ${size.is_active ? 'badge-customer' : 'badge-supplier'}`}>
                            {size.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-outline btn-sm cursor-pointer"
                              onClick={() => handleEditSize(size)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm cursor-pointer"
                              onClick={() => handleDeleteSize(size.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}


        {/* Type Modal */}
        {showTypeModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }} onClick={() => setShowTypeModal(false)}>
            <div className="card" style={{
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>
                {editingType ? 'Edit Bin Type' : 'Create Bin Type'}
              </h2>
              <form onSubmit={handleSubmitType}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={typeFormData.name}
                    onChange={(e) => setTypeFormData({ ...typeFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    value={typeFormData.description}
                    onChange={(e) => setTypeFormData({ ...typeFormData, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    className="form-control"
                    value={typeFormData.display_order}
                    onChange={(e) => setTypeFormData({ ...typeFormData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      checked={typeFormData.is_active}
                      onChange={(e) => setTypeFormData({ ...typeFormData, is_active: e.target.checked })}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Active
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary cursor-pointer">
                    {editingType ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline cursor-pointer"
                    onClick={() => setShowTypeModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Size Modal */}
        {showSizeModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }} onClick={() => setShowSizeModal(false)}>
            <div className="card" style={{
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>
                {editingSize ? 'Edit Bin Size' : 'Create Bin Size'}
              </h2>
              <form onSubmit={handleSubmitSize}>
                <div className="form-group">
                  <label className="form-label">Bin Type *</label>
                  <select
                    className="form-control"
                    value={sizeFormData.bin_type_id}
                    onChange={(e) => setSizeFormData({ ...sizeFormData, bin_type_id: e.target.value })}
                    required
                  >
                    <option value="">Select bin type</option>
                    {binTypes.filter(t => t.is_active).map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Size *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={sizeFormData.size}
                    onChange={(e) => setSizeFormData({ ...sizeFormData, size: e.target.value })}
                    placeholder="e.g., 3m³"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Capacity (m³) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={sizeFormData.capacity_cubic_meters}
                    onChange={(e) => setSizeFormData({ ...sizeFormData, capacity_cubic_meters: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    className="form-control"
                    value={sizeFormData.display_order}
                    onChange={(e) => setSizeFormData({ ...sizeFormData, display_order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <input
                      type="checkbox"
                      checked={sizeFormData.is_active}
                      onChange={(e) => setSizeFormData({ ...sizeFormData, is_active: e.target.checked })}
                      style={{ marginRight: '0.5rem' }}
                    />
                    Active
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary cursor-pointer">
                    {editingSize ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline cursor-pointer"
                    onClick={() => setShowSizeModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
