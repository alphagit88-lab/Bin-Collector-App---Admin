'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface PricingSubmission {
  id: number;
  service_area_id: number;
  bin_size_id: number | null;
  bin_type_id: number | null;
  supplier_price: string;
  admin_final_price: string | null;
  is_active: boolean;
  bin_size_name: string | null;
  bin_type_name: string;
  city: string;
  country: string;
  supplier_name: string;
  created_at: string;
}

export default function BinPricingPage() {
  const { showToast } = useToast();
  const [submissions, setSubmissions] = useState<PricingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    finalPrice: '',
    isActive: false
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ submissions: PricingSubmission[] }>('/admin/bin-pricing/submissions');
      if (response.success && response.data) {
        setSubmissions(response.data.submissions);
      }
    } catch (error) {
      showToast('Failed to fetch submissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (submission: PricingSubmission) => {
    setEditingId(submission.id);
    setEditForm({
      finalPrice: submission.admin_final_price || submission.supplier_price,
      isActive: submission.is_active
    });
  };

  const handleUpdate = async (id: number) => {
    setUpdating(id);
    try {
      const response = await api.put(`/admin/bin-pricing/submissions/${id}`, {
        finalPrice: parseFloat(editForm.finalPrice),
        isActive: editForm.isActive
      });

      if (response.success) {
        showToast('Pricing updated successfully', 'success');
        setEditingId(null);
        fetchData();
      } else {
        showToast(response.message || 'Failed to update pricing', 'error');
      }
    } catch (error) {
      showToast('An error occurred while updating', 'error');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
          <p className="font-light" style={{ color: 'var(--color-text-secondary)' }}>Loading submissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Bin Pricing Approval</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Review supplier price suggestions and set final active prices for customers</p>
        </div>

        <div className="bg-white shadow-xl border border-gray-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-bottom border-gray-100">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bin Type & Size</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier Price</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Final Price</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400 font-light">
                      No pricing submissions found.
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{sub.supplier_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title={`${sub.city}, ${sub.country}`}>
                        {sub.city}, {sub.country}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="font-medium text-gray-800">{sub.bin_type_name}</span>
                        {sub.bin_size_name && <span className="text-gray-400 ml-1">({sub.bin_size_name})</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-mono text-gray-600">
                        ${parseFloat(sub.supplier_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {editingId === sub.id ? (
                          <div className="flex items-center justify-center space-x-1">
                            <span className="text-gray-400">$</span>
                            <input
                              type="number"
                              autoFocus
                              className="w-24 px-2 py-1 border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                              value={editForm.finalPrice}
                              onChange={(e) => setEditForm({ ...editForm, finalPrice: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            {sub.admin_final_price ? (
                              <span className="font-bold text-emerald-600 font-mono">
                                ${parseFloat(sub.admin_final_price).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs italic">Not set</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {editingId === sub.id ? (
                          <label className="flex items-center justify-center cursor-pointer space-x-2">
                            <input
                              type="checkbox"
                              checked={editForm.isActive}
                              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                              className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                            />
                            <span className="text-xs font-medium text-gray-600">Active</span>
                          </label>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            sub.is_active 
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-100 text-amber-700 border border-amber-200'
                          }`}>
                            {sub.is_active ? 'Active' : 'Pending'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {editingId === sub.id ? (
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleUpdate(sub.id)}
                              disabled={updating === sub.id}
                              className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                            >
                              {updating === sub.id ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(sub)}
                            className="bg-white border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-all shadow-sm hover:shadow active:scale-95"
                          >
                            Approve / Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
