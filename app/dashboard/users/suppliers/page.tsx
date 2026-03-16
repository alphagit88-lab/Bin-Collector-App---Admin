'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Supplier {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: 'supplier';
  supplierType?: 'commercial' | 'residential' | 'commercial_residential' | null;
  created_at: string;
}

export default function SuppliersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    supplierType: 'commercial' as 'commercial' | 'residential' | 'commercial_residential',
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    const response = await api.get<{ users: Supplier[] }>('/admin/users/supplier');
    if (response.success && response.data) {
      setSuppliers(response.data.users);
    } else {
      showToast('Failed to fetch suppliers', 'error');
    }
    setLoading(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSupplier) {
      const response = await api.put<{ user: Supplier }>(`/admin/users/${editingSupplier.id}`, {
        name: formData.name,
        email: formData.email || undefined,
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
      if (!formData.password || formData.password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
      }

      const response = await api.post<{ user: Supplier }>('/admin/users', {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        role: 'supplier',
        password: formData.password,
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

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Type</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
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
                    <td>{new Date(supplier.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                      <input
                        type="password"
                        className="form-control"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                        minLength={6}
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
      </div>
    </div>
  );
}
