'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { normalizePassword, validatePassword } from '@/lib/passwordValidation';
import PasswordRequirements from '@/components/PasswordRequirements';
import PasswordInput from '@/components/PasswordInput';
import { normalizeCanadianPhone, validateCanadianPhone } from '@/lib/phoneValidation';

interface Supplier {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: 'supplier';
  supplierType?: 'commercial' | 'residential' | 'commercial_residential' | null;
  deleteRequest?: boolean;
  isActive: boolean;
  serviceAreas?: string | null;
  created_at: string;
}

export default function SuppliersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [hoveredTooltip, setHoveredTooltip] = useState<{
    text: string;
    x: number;
    y: number;
    placeAbove: boolean;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    supplierType: 'commercial' as 'commercial' | 'residential' | 'commercial_residential',
  });

  useEffect(() => {
    fetchSuppliers();
  }, [appliedSearch]);

  const fetchSuppliers = async () => {
    setLoading(true);
    const searchParam = appliedSearch ? `?search=${encodeURIComponent(appliedSearch)}` : '';
    const response = await api.get<{ users: Supplier[] }>(`/admin/users/supplier${searchParam}`);
    if (response.success && response.data) {
      setSuppliers(response.data.users);
    } else {
      showToast('Failed to fetch suppliers', 'error');
    }
    setLoading(false);
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const handleResetFilter = () => {
    setSearchInput('');
    setAppliedSearch('');
  };

  const handleCreate = () => {
    setEditingSupplier(null);
    setFormData({ name: '', phone: '', email: '', password: '', supplierType: 'commercial' });
    setShowModal(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email || '',
      password: '',
      supplierType: (supplier.supplierType as any) || 'commercial',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    const response = await api.delete(`/admin/users/${id}`);
    if (response.success) {
      showToast('Supplier deleted successfully', 'success');
      fetchSuppliers();
    } else {
      showToast(response.message || 'Failed to delete supplier', 'error');
    }
  };

  const handleActivation = async (supplier: Supplier) => {
    const nextActive = !supplier.isActive;
    if (!confirm(`Are you sure you want to ${nextActive ? 'activate' : 'deactivate'} this supplier?`)) return;

    const response = await api.put<{ user: Supplier }>(`/admin/users/${supplier.id}`, {
      isActive: nextActive,
    });
    if (response.success) {
      showToast(`Supplier ${nextActive ? 'activated' : 'deactivated'} successfully`, 'success');
      fetchSuppliers();
    } else {
      showToast(response.message || 'Failed to update supplier status', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }

    if (editingSupplier) {
      const response = await api.put<{ user: Supplier }>(`/admin/users/${editingSupplier.id}`, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        supplierType: formData.supplierType,
      });

      if (response.success) {
        showToast('Supplier updated successfully', 'success');
        setShowModal(false);
        fetchSuppliers();
      } else {
        showToast(response.message || 'Failed to update supplier', 'error');
      }
    } else {
      const phoneError = validateCanadianPhone(formData.phone);
      if (phoneError) {
        showToast(phoneError, 'error');
        return;
      }
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        showToast(passwordError, 'error');
        return;
      }

      const response = await api.post<{ user: Supplier }>('/admin/users', {
        name: formData.name.trim(),
        phone: normalizeCanadianPhone(formData.phone),
        email: formData.email.trim().toLowerCase(),
        role: 'supplier',
        password: normalizePassword(formData.password),
        supplierType: formData.supplierType,
      });

      if (response.success) {
        showToast('Supplier created successfully', 'success');
        setShowModal(false);
        fetchSuppliers();
      } else {
        showToast(response.message || 'Failed to create supplier', 'error');
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Supplier Management</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>View and manage all supplier accounts</p>
          </div>
          <button className="btn btn-primary cursor-pointer" onClick={handleCreate}>
            + Add Supplier
          </button>
        </div>

        {/* Filter bar */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <form onSubmit={handleApplyFilter} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, phone, email or city..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="form-control w-full"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary cursor-pointer px-4 py-2">
                Filter
              </button>
              <button
                type="button"
                onClick={handleResetFilter}
                className="btn btn-outline cursor-pointer px-4 py-2"
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Type</th>
                <th>Service Areas</th>
                <th>Status</th>
                <th>Delete Request</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem' }}>
                    No suppliers found
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td style={{ fontWeight: 500 }}>{supplier.name}</td>
                    <td>{supplier.phone}</td>
                    <td>{supplier.email || '-'}</td>
                    <td style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
                      {supplier.supplierType === 'commercial'
                        ? 'Commercial'
                        : supplier.supplierType === 'residential'
                        ? 'Residential'
                        : supplier.supplierType === 'commercial_residential'
                        ? 'Commercial / Residential'
                        : '-'}
                    </td>
                    <td>
                      {supplier.serviceAreas ? (
                        <div className="relative inline-block">
                          <span
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const placeAbove = rect.bottom + 120 > window.innerHeight;
                              const x = Math.min(rect.left, Math.max(10, window.innerWidth - 340));
                              const y = placeAbove ? rect.top - 6 : rect.bottom + 6;
                              setHoveredTooltip({
                                text: supplier.serviceAreas!,
                                x,
                                y,
                                placeAbove,
                              });
                            }}
                            onMouseLeave={() => setHoveredTooltip(null)}
                            title={supplier.serviceAreas}
                            style={{
                              display: 'block',
                              maxWidth: '160px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              color: 'var(--color-text-primary)',
                              textDecoration: 'underline dotted',
                              textUnderlineOffset: '3px',
                            }}
                          >
                            {supplier.serviceAreas}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: supplier.isActive ? '#059669' : '#D97706', fontWeight: 600 }}>
                        {supplier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {supplier.deleteRequest ? (
                        <span style={{ color: '#EF4444', fontWeight: 600 }}>Requested</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                      )}
                    </td>
                    <td>{new Date(supplier.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className={`btn btn-sm cursor-pointer ${supplier.isActive ? 'btn-outline' : 'btn-primary'}`}
                          onClick={() => handleActivation(supplier)}
                        >
                          {supplier.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-outline btn-sm cursor-pointer"
                          onClick={() => handleEdit(supplier)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm cursor-pointer"
                          onClick={() => handleDelete(supplier.id)}
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

        {showModal && (
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
          }} onClick={() => setShowModal(false)}>
            <div className="card" style={{
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
            }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{ marginBottom: '1.5rem' }}>
                {editingSupplier ? 'Edit Supplier' : 'Create Supplier'}
              </h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                {!editingSupplier && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Password *</label>
                      <PasswordRequirements password={formData.password} />
                      <PasswordInput
                        className="form-control"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={8}
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Supplier Type *</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.supplierType === 'commercial' ? 'btn-primary' : 'btn-outline'} cursor-pointer`}
                      onClick={() => setFormData({ ...formData, supplierType: 'commercial' })}
                    >
                      Commercial
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.supplierType === 'residential' ? 'btn-primary' : 'btn-outline'} cursor-pointer`}
                      onClick={() => setFormData({ ...formData, supplierType: 'residential' })}
                    >
                      Residential
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${formData.supplierType === 'commercial_residential' ? 'btn-primary' : 'btn-outline'} cursor-pointer`}
                      onClick={() => setFormData({ ...formData, supplierType: 'commercial_residential' })}
                      style={{ whiteSpace: 'normal', wordWrap: 'break-word', lineHeight: '1.2' }}
                    >
                      Commercial / Residential
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary cursor-pointer">
                    {editingSupplier ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline cursor-pointer"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Floating Service Areas Tooltip */}
        {hoveredTooltip && (
          <div
            style={{
              position: 'fixed',
              left: hoveredTooltip.x,
              top: hoveredTooltip.y,
              transform: hoveredTooltip.placeAbove ? 'translateY(-100%)' : 'none',
              zIndex: 9999,
              maxWidth: '320px',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              fontSize: '0.8125rem',
              lineHeight: '1.5',
              padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              pointerEvents: 'none',
              wordBreak: 'break-word',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Service Locations
            </div>
            <div>{hoveredTooltip.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}
