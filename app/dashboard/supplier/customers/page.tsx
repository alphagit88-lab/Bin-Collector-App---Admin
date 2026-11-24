'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { normalizeCanadianPhone, validateCanadianPhone } from '@/lib/phoneValidation';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  created_at: string;
  is_active: boolean;
}

export default function SupplierCustomersPage() {
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  // Add Customer modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [appliedSearch]);

  const fetchCustomers = async () => {
    setLoading(true);
    const searchParam = appliedSearch ? `&search=${encodeURIComponent(appliedSearch)}` : '';
    const response = await api.get<any>(`/supplier/customers?includeInactive=true${searchParam}`);
    if (response.success && response.data) {
      // API returns { success, data: [...] }
      const list = Array.isArray(response.data) ? response.data : (response.data.data ?? []);
      setCustomers(list);
    } else {
      showToast('Failed to fetch customers', 'error');
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

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
    });
    setShowModal(true);
  };

  const handleToggleStatus = async (customer: Customer) => {
    const action = customer.is_active ? 'deactivate' : 'activate';
    if (!confirm(`Are you sure you want to ${action} this customer?`)) return;
    const response = await api.put<any>(`/supplier/customers/${customer.id}/toggle`);
    if (response.success) {
      showToast(`Customer ${action}d successfully`, 'success');
      setCustomers(prev => prev.map(c => c.id === customer.id ? { ...c, is_active: !c.is_active } : c));
    } else {
      showToast(response.message || `Failed to ${action} customer`, 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }
    setSubmitting(true);
    const response = await api.put<any>(`/supplier/customers/${editingCustomer.id}`, {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
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

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFormData.name.trim() || !addFormData.phone.trim() || !addFormData.email.trim()) {
      showToast('Name, phone, and email are required', 'error');
      return;
    }
    const phoneError = validateCanadianPhone(addFormData.phone);
    if (phoneError) {
      showToast(phoneError, 'error');
      return;
    }
    setSubmittingAdd(true);
    const response = await api.post<any>('/supplier/customers', {
      name: addFormData.name.trim(),
      phone: normalizeCanadianPhone(addFormData.phone),
      email: addFormData.email.trim().toLowerCase(),
    });
    if (response.success) {
      showToast(response.message || 'Customer added successfully', 'success');
      setShowAddModal(false);
      setAddFormData({ name: '', phone: '', email: '' });
      fetchCustomers();
    } else {
      showToast(response.message || 'Failed to add customer', 'error');
    }
    setSubmittingAdd(false);
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
          <button
            onClick={() => {
              setAddFormData({ name: '', phone: '', email: '' });
              setShowAddModal(true);
            }}
            className="btn btn-primary flex items-center px-4 py-2 cursor-pointer transition-all hover:opacity-95 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)', color: 'white', border: 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Customer
          </button>
        </div>

        {/* Filter bar */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <form onSubmit={handleApplyFilter} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, phone or email..."
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
                <th>Created</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-secondary)' }}>
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
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: customer.is_active !== false ? '#D1FAE5' : '#FEE2E2',
                        color: customer.is_active !== false ? '#065F46' : '#991B1B',
                      }}>
                        {customer.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-outline btn-sm cursor-pointer"
                          onClick={() => handleEdit(customer)}
                        >
                          Edit
                        </button>
                        <button
                          className={`btn btn-sm cursor-pointer ${customer.is_active !== false ? 'btn-danger' : 'btn-outline'}`}
                          onClick={() => handleToggleStatus(customer)}
                        >
                          {customer.is_active !== false ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Edit Customer Modal */}
        {showModal && editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Edit Customer</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter customer name"
                      className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editingCustomer.phone}
                      disabled
                      className="w-full px-4 py-2 border rounded-md bg-gray-100 text-gray-500 cursor-not-allowed outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">Phone number cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="customer@example.com"
                      required
                      className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium flex items-center cursor-pointer disabled:opacity-70"
                  >
                    {submitting ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Customer Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Add Customer</h2>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <form onSubmit={handleAddCustomer} className="p-6">
                <p className="text-sm text-gray-500 mb-4">
                  If an account already exists with this mobile number, they will be assigned to your account.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter customer name"
                      value={addFormData.name}
                      onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mobile Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g., +14165550123"
                      value={addFormData.phone}
                      onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      placeholder="customer@example.com"
                      value={addFormData.email}
                      onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                      required
                      className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium flex items-center cursor-pointer disabled:opacity-70"
                  >
                    {submittingAdd ? 'Adding...' : 'Add Customer'}
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
