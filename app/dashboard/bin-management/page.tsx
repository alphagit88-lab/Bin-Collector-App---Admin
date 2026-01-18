'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

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

interface BinType {
  id: number;
  name: string;
  is_active: boolean;
}

interface BinSize {
  id: number;
  bin_type_id: number;
  size: string;
  is_active: boolean;
}

interface Supplier {
  id: number;
  name: string;
  phone: string;
}

export default function BinManagementPage() {
  const { showToast } = useToast();
  const [physicalBins, setPhysicalBins] = useState<PhysicalBin[]>([]);
  const [binTypes, setBinTypes] = useState<BinType[]>([]);
  const [binSizes, setBinSizes] = useState<BinSize[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showPhysicalBinModal, setShowPhysicalBinModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBinForAssign, setSelectedBinForAssign] = useState<PhysicalBin | null>(null);
  const [physicalBinFormData, setPhysicalBinFormData] = useState({
    bin_code: '',
    bin_type_id: '',
    bin_size_id: '',
    supplier_id: '',
    notes: '',
  });
  const [binSizesForPhysical, setBinSizesForPhysical] = useState<BinSize[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchBinSizes = async (binTypeId: number) => {
    const response = await api.get<{ binSizes: BinSize[] }>(`/bins/sizes?binTypeId=${binTypeId}`);
    if (response.success && response.data) {
      setBinSizesForPhysical(response.data.binSizes);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [binsResponse, typesResponse, suppliersResponse] = await Promise.all([
        api.get<any>('/bins/physical'),
        api.get<{ binTypes: BinType[] }>('/bins/types?includeInactive=true'),
        api.get<{ users: Supplier[] }>('/admin/users/supplier'),
      ]);

      if (binsResponse.success) {
        const bins = (binsResponse as any).bins || binsResponse.data?.bins || [];
        setPhysicalBins(bins);
      }
      if (typesResponse.success && typesResponse.data) {
        setBinTypes(typesResponse.data.binTypes);
      }
      if (suppliersResponse.success && suppliersResponse.data) {
        const users = suppliersResponse.data.users || [];
        setSuppliers(users);
      }
    } catch (error) {
      showToast('Failed to fetch data', 'error');
    } finally {
      setLoading(false);
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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Bin Management</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Manage physical bins and their assignments</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by bin code..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
              />
            </div>
            <select
              className="form-control"
              style={{ width: '200px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="confirmed">Confirmed</option>
              <option value="loaded">Loaded</option>
              <option value="delivered">Delivered</option>
              <option value="ready_to_pickup">Ready to Pickup</option>
              <option value="picked_up">Picked Up</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          <button className="btn btn-primary cursor-pointer" onClick={() => {
            setPhysicalBinFormData({ bin_code: '', bin_type_id: '', bin_size_id: '', supplier_id: '', notes: '' });
            setShowPhysicalBinModal(true);
          }}>
            + Create Bin
          </button>
        </div>

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Bin Code</th>
                <th>Type & Size</th>
                <th>Status</th>
                <th>Supplier</th>
                <th>Current Customer</th>
                <th>Current Location</th>
                <th>Request ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {physicalBins
                .filter(bin => {
                  const matchesCode = !searchCode || bin.bin_code.toLowerCase().includes(searchCode.toLowerCase());
                  const matchesStatus = filterStatus === 'all' || bin.status === filterStatus;
                  return matchesCode && matchesStatus;
                })
                .map((bin) => (
                  <tr key={bin.id}>
                    <td style={{ fontWeight: 600 }}>{bin.bin_code}</td>
                    <td>{bin.bin_type_name} - {bin.bin_size}</td>
                    <td>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: bin.status === 'available' ? '#10B98120' : 
                                        bin.status === 'unavailable' ? '#EF444420' : '#3B82F620',
                        color: bin.status === 'available' ? '#10B981' : 
                               bin.status === 'unavailable' ? '#EF4444' : '#3B82F6'
                      }}>
                        {bin.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td>{bin.supplier_name || '-'}</td>
                    <td>{bin.customer_name || '-'}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bin.current_location || '-'}
                    </td>
                    <td>{bin.request_id || '-'}</td>
                    <td>
                      <button
                        className="btn btn-outline btn-sm cursor-pointer"
                        onClick={() => {
                          setSelectedBinForAssign(bin);
                          setShowAssignModal(true);
                        }}
                      >
                        {bin.supplier_name ? 'Reassign' : 'Assign'}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {physicalBins.filter(bin => {
            const matchesCode = !searchCode || bin.bin_code.toLowerCase().includes(searchCode.toLowerCase());
            const matchesStatus = filterStatus === 'all' || bin.status === filterStatus;
            return matchesCode && matchesStatus;
          }).length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
              No bins found
            </div>
          )}
        </div>

        {/* Physical Bin Create Modal */}
        {showPhysicalBinModal && (
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
          }} onClick={() => setShowPhysicalBinModal(false)}>
            <div className="card" style={{
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>Create Physical Bin</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const response = await api.post('/bins/physical', {
                    bin_code: physicalBinFormData.bin_code || undefined,
                    bin_type_id: parseInt(physicalBinFormData.bin_type_id),
                    bin_size_id: parseInt(physicalBinFormData.bin_size_id),
                    supplier_id: physicalBinFormData.supplier_id ? parseInt(physicalBinFormData.supplier_id) : undefined,
                    notes: physicalBinFormData.notes || undefined,
                  });
                  if (response.success) {
                    showToast('Bin created successfully', 'success');
                    setShowPhysicalBinModal(false);
                    setPhysicalBinFormData({ bin_code: '', bin_type_id: '', bin_size_id: '', supplier_id: '', notes: '' });
                    fetchData();
                  } else {
                    showToast(response.message || 'Failed to create bin', 'error');
                  }
                } catch (error) {
                  showToast('Failed to create bin', 'error');
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Bin Code (Optional - Auto-generated if empty)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={physicalBinFormData.bin_code}
                    onChange={(e) => setPhysicalBinFormData({ ...physicalBinFormData, bin_code: e.target.value })}
                    placeholder="e.g., BIN-ABC12"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Bin Type *</label>
                  <select
                    className="form-control"
                    value={physicalBinFormData.bin_type_id}
                    onChange={(e) => {
                      setPhysicalBinFormData({ ...physicalBinFormData, bin_type_id: e.target.value, bin_size_id: '' });
                      if (e.target.value) {
                        fetchBinSizes(parseInt(e.target.value));
                      }
                    }}
                    required
                  >
                    <option value="">Select bin type</option>
                    {binTypes.filter(t => t.is_active).map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Bin Size *</label>
                  <select
                    className="form-control"
                    value={physicalBinFormData.bin_size_id}
                    onChange={(e) => setPhysicalBinFormData({ ...physicalBinFormData, bin_size_id: e.target.value })}
                    disabled={!physicalBinFormData.bin_type_id}
                    required
                  >
                    <option value="">Select bin size</option>
                    {binSizesForPhysical.map((size) => (
                      <option key={size.id} value={size.id}>{size.size}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Assign to Supplier (Optional)</label>
                  <select
                    className="form-control"
                    value={physicalBinFormData.supplier_id}
                    onChange={(e) => setPhysicalBinFormData({ ...physicalBinFormData, supplier_id: e.target.value })}
                  >
                    <option value="">No supplier (unassigned)</option>
                    {suppliers.length === 0 ? (
                      <option value="" disabled>No suppliers available</option>
                    ) : (
                      suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.phone})</option>
                      ))
                    )}
                  </select>
                  {suppliers.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.5rem' }}>
                      No suppliers found. Create suppliers first.
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Notes (Optional)</label>
                  <textarea
                    className="form-control"
                    value={physicalBinFormData.notes}
                    onChange={(e) => setPhysicalBinFormData({ ...physicalBinFormData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary cursor-pointer">Create Bin</button>
                  <button
                    type="button"
                    className="btn btn-outline cursor-pointer"
                    onClick={() => setShowPhysicalBinModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Bin Modal */}
        {showAssignModal && selectedBinForAssign && (
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
          }} onClick={() => setShowAssignModal(false)}>
            <div className="card" style={{
              maxWidth: '400px',
              width: '90%',
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>Assign Bin to Supplier</h2>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>Bin Code</div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{selectedBinForAssign.bin_code}</div>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const supplierId = formData.get('supplier_id') as string;
                try {
                  const response = await api.put(`/bins/physical/${selectedBinForAssign.id}/assign`, {
                    supplier_id: supplierId ? parseInt(supplierId) : null,
                  });
                  if (response.success) {
                    showToast('Bin assigned successfully', 'success');
                    setShowAssignModal(false);
                    setSelectedBinForAssign(null);
                    fetchData();
                  } else {
                    showToast(response.message || 'Failed to assign bin', 'error');
                  }
                } catch (error) {
                  showToast('Failed to assign bin', 'error');
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Select Supplier</label>
                  <select
                    name="supplier_id"
                    className="form-control"
                    defaultValue={selectedBinForAssign.supplier_name ? suppliers.find(s => s.name === selectedBinForAssign.supplier_name)?.id || '' : ''}
                  >
                    <option value="">Unassign (remove from supplier)</option>
                    {suppliers.length === 0 ? (
                      <option value="" disabled>No suppliers available</option>
                    ) : (
                      suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.phone})</option>
                      ))
                    )}
                  </select>
                  {suppliers.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.5rem' }}>
                      No suppliers found. Create suppliers first.
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary cursor-pointer">Assign</button>
                  <button
                    type="button"
                    className="btn btn-outline cursor-pointer"
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedBinForAssign(null);
                    }}
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
