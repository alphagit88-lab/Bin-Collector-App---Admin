'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: 'driver';
  supplierId?: number;
  supplier_name?: string;
  created_at: string;
}

interface Supplier {
    id: number;
    name: string;
}

export default function DriversPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [drivers, setDrivers] = useState<User[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    supplierId: '' as string | number,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [driversRes, suppliersRes] = await Promise.all([
        api.get<{ users: User[] }>('/admin/users/driver'),
        api.get<{ users: Supplier[] }>('/admin/users/supplier'),
    ]);

    if (driversRes.success && driversRes.data) {
      setDrivers(driversRes.data.users);
    } else {
      showToast('Failed to fetch drivers', 'error');
    }

    if (suppliersRes.success && suppliersRes.data) {
        setSuppliers(suppliersRes.data.users);
    }

    setLoading(false);
  };

  const handleCreate = () => {
    setEditingDriver(null);
    setFormData({ name: '', phone: '', email: '', password: '', supplierId: '' });
    setShowModal(true);
  };

  const handleEdit = (driver: User) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      phone: driver.phone,
      email: driver.email || '',
      password: '',
      supplierId: driver.supplierId || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this driver?')) return;

    const response = await api.delete(`/admin/users/${id}`);
    if (response.success) {
      showToast('Driver deleted successfully', 'success');
      fetchData();
    } else {
      showToast(response.message || 'Failed to delete driver', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
        name: formData.name,
        email: formData.email || undefined,
        supplierId: formData.supplierId ? parseInt(formData.supplierId.toString()) : null,
    };

    if (editingDriver) {
      const response = await api.put<{ user: User }>(`/admin/users/${editingDriver.id}`, payload);

      if (response.success) {
        showToast('Driver updated successfully', 'success');
        setShowModal(false);
        fetchData();
      } else {
        showToast(response.message || 'Failed to update driver', 'error');
      }
    } else {
      if (!formData.password || formData.password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
      }

      const response = await api.post<{ user: User }>('/admin/users', {
        ...payload,
        phone: formData.phone,
        password: formData.password,
        role: 'driver',
      });

      if (response.success) {
        showToast('Driver created successfully', 'success');
        setShowModal(false);
        fetchData();
      } else {
        showToast(response.message || 'Failed to create driver', 'error');
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Driver Management</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>View and manage all driver accounts and their assignments</p>
          </div>
          <button className="btn btn-primary cursor-pointer" onClick={handleCreate}>
            + Add Driver
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Assigned Supplier</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No drivers found
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.id}>
                    <td style={{ fontWeight: 500 }}>{driver.name}</td>
                    <td>{driver.phone}</td>
                    <td>{driver.email || '-'}</td>
                    <td>
                        {suppliers.find(s => s.id === driver.supplierId)?.name || <span className="text-gray-400">Not Assigned</span>}
                    </td>
                    <td>{new Date(driver.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-outline btn-sm cursor-pointer"
                          onClick={() => handleEdit(driver)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm cursor-pointer"
                          onClick={() => handleDelete(driver.id)}
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
                {editingDriver ? 'Edit Driver' : 'Create Driver'}
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

                {!editingDriver && (
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
                  <label className="form-label">Assigned Supplier</label>
                  <select 
                    className="form-control"
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                  >
                    <option value="">Select a Supplier (Optional)</option>
                    {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary cursor-pointer">
                    {editingDriver ? 'Update' : 'Create'}
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
