'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { normalizePassword, validatePassword } from '@/lib/passwordValidation';
import ListPagination from '@/components/ListPagination';
import PasswordRequirements from '@/components/PasswordRequirements';
import PasswordInput from '@/components/PasswordInput';
import { normalizeCanadianPhone, validateCanadianPhone } from '@/lib/phoneValidation';

interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: 'customer';
  isActive: boolean;
  canViewBilling: boolean;
  deleteRequest?: boolean;
  created_at: string;
}

export default function CustomersPage() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedStartDate, setAppliedStartDate] = useState('');
  const [appliedEndDate, setAppliedEndDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    fetchCustomers();
  }, [page, appliedSearch, appliedStartDate, appliedEndDate]);

  const fetchCustomers = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: '10' });
    if (appliedStartDate) params.set('startDate', appliedStartDate);
    if (appliedEndDate) params.set('endDate', appliedEndDate);
    if (appliedSearch) params.set('search', appliedSearch);
    const response = await api.get<{ users: Customer[]; pagination?: { totalPages: number } }>(`/admin/users/customer?${params}`);
    if (response.success && response.data) {
      setCustomers(response.data.users);
      setServerTotalPages(Math.max(1, response.data.pagination?.totalPages || 1));
    } else {
      showToast('Failed to fetch customers', 'error');
    }
    setLoading(false);
  };

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  };

  const handleResetFilter = () => {
    setSearchInput('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    setAppliedSearch('');
    setAppliedStartDate('');
    setAppliedEndDate('');
  };

  const handleToggleBilling = async (customer: Customer) => {
    const newVal = !customer.canViewBilling;
    try {
      const response = await api.post('/billing/toggle-visibility', {
        userId: customer.id,
        canViewBilling: newVal,
      });

      if (response.success) {
        showToast(`Billing access ${newVal ? 'enabled' : 'disabled'} for ${customer.name}`, 'success');
        setCustomers(customers.map(c => 
          c.id === customer.id ? { ...c, canViewBilling: newVal } : c
        ));
      } else {
        showToast(response.message || 'Failed to update billing access', 'error');
      }
    } catch (error) {
      showToast('Error updating billing access', 'error');
    }
  };

  const handleCreate = () => {
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', password: '' });
    setShowModal(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      password: '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    const response = await api.delete(`/admin/users/${id}`);
    if (response.success) {
      showToast('Customer deleted successfully', 'success');
      fetchCustomers();
    } else {
      showToast(response.message || 'Failed to delete customer', 'error');
    }
  };

  const handleActivation = async (customer: Customer) => {
    const nextActive = !customer.isActive;
    if (!confirm(`Are you sure you want to ${nextActive ? 'activate' : 'deactivate'} this customer?`)) return;

    const response = await api.put<{ user: Customer }>(`/admin/users/${customer.id}`, {
      isActive: nextActive,
    });
    if (response.success) {
      showToast(`Customer ${nextActive ? 'activated' : 'deactivated'} successfully`, 'success');
      fetchCustomers();
    } else {
      showToast(response.message || 'Failed to update customer status', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      showToast('Name and email are required', 'error');
      return;
    }

    if (editingCustomer) {
      const response = await api.put<{ user: Customer }>(`/admin/users/${editingCustomer.id}`, {
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

      const response = await api.post<{ user: Customer }>('/admin/users', {
        name: formData.name.trim(),
        phone: normalizeCanadianPhone(formData.phone),
        email: formData.email.trim().toLowerCase(),
        role: 'customer',
        password: normalizePassword(formData.password),
      });

      if (response.success) {
        showToast('Customer created successfully', 'success');
        setShowModal(false);
        fetchCustomers();
      } else {
        showToast(response.message || 'Failed to create customer', 'error');
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
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Customer Management</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>View and manage all customer accounts</p>
          </div>
          <button className="btn btn-primary cursor-pointer" onClick={handleCreate}>
            + Add Customer
          </button>
        </div>

        {/* Filter bar */}
        <div className="mb-6 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
          <form onSubmit={handleApplyFilter} className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search by name, phone or email..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="form-control w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                max={endDate || undefined}
                onChange={e => setStartDate(e.target.value)}
                className="form-control"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={e => setEndDate(e.target.value)}
                className="form-control"
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
                <th>Status</th>
                <th>Billing Access</th>
                <th>Delete Request</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                    No customers found
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id}>
                    <td style={{ fontWeight: 500 }}>{customer.name}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.email || '-'}</td>
                    <td>
                      <span style={{ color: customer.isActive ? '#059669' : '#D97706', fontWeight: 600 }}>
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div 
                        onClick={() => handleToggleBilling(customer)}
                        style={{
                          width: '40px',
                          height: '20px',
                          backgroundColor: customer.canViewBilling ? '#10B981' : '#D1D5DB',
                          borderRadius: '20px',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s'
                        }}
                      >
                        <div style={{
                          width: '16px',
                          height: '16px',
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: '2px',
                          left: customer.canViewBilling ? '22px' : '2px',
                          transition: 'left 0.2s'
                        }} />
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {customer.deleteRequest ? (
                        <span style={{ color: '#EF4444', fontWeight: 600 }}>Requested</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-secondary)' }}>-</span>
                      )}
                    </td>
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
                          className={`btn btn-sm cursor-pointer ${customer.isActive ? 'btn-outline' : 'btn-primary'}`}
                          onClick={() => handleActivation(customer)}
                        >
                          {customer.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm cursor-pointer"
                          onClick={() => handleDelete(customer.id)}
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
          <ListPagination page={page} totalPages={serverTotalPages} onPageChange={setPage} />
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
                {editingCustomer ? 'Edit Customer' : 'Create Customer'}
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

                {!editingCustomer && (
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

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button type="submit" className="btn btn-primary cursor-pointer">
                    {editingCustomer ? 'Update' : 'Create'}
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
