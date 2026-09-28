'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
}

export default function SupplierCustomersPage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const response = await api.get<any>('/supplier/customers');
    if (response.success && response.data) {
      // API returns { success, data: [...] }
      const list = Array.isArray(response.data) ? response.data : (response.data.data ?? []);
      setCustomers(list);
    } else {
      showToast('Failed to fetch customers', 'error');
    }
    setLoading(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this customer?')) return;
    const response = await api.delete(`/supplier/customers/${id}`);
    if (response.success) {
      showToast('Customer removed successfully', 'success');
      setCustomers(prev => prev.filter(c => c.id !== id));
    } else {
      showToast(response.message || 'Failed to remove customer', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setSubmitting(true);
    const response = await api.put<any>(`/supplier/customers/${editingCustomer.id}`, {
      name: formData.name,
      email: formData.email || undefined,
    });
    if (response.success) {
      showToast('Customer updated successfully', 'success');
      setShowModal(false);
      fetchCustomers();
    } else {
      showToast(response.message || 'Failed to update customer', 'error');
    }
    setSubmitting(false);
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>My Customers</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Manage customers assigned to your account</p>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
                    No customers found. Customers are added automatically when you create orders for new customers.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td style={{ fontWeight: 500 }}>{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.email || '-'}</td>
                    <td>{new Date(customer.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-outline btn-sm cursor-pointer"
                          onClick={() => handleEdit(customer)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm cursor-pointer"
                          onClick={() => handleDelete(customer.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && editingCustomer && (
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
              <h2 style={{ marginBottom: '1.5rem' }}>Edit Customer</h2>
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

                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editingCustomer.phone}
                    disabled
                    style={{ backgroundColor: 'var(--color-bg-secondary)', cursor: 'not-allowed', opacity: 0.7 }}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>Phone cannot be changed</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary cursor-pointer" disabled={submitting}>
                    {submitting ? 'Saving...' : 'Update'}
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
