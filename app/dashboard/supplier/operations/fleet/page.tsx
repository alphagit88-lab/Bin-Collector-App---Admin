'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface BinItem {
  id: number;
  bin_code: string;
  bin_type_name: string;
  bin_size: string;
  status: string;
  notes?: string;
  current_location?: string;
  current_latitude?: number | string;
  current_longitude?: number | string;
}

interface BinType {
  id: number;
  name: string;
}

interface BinSize {
  id: number;
  size: string;
}

export default function FleetPage() {
  const { showToast } = useToast();
  const [bins, setBins] = useState<BinItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Bin Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [binTypes, setBinTypes] = useState<BinType[]>([]);
  const [binSizes, setBinSizes] = useState<BinSize[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fetchingSizes, setFetchingSizes] = useState(false);
  
  const [areaPrices, setAreaPrices] = useState<{ [areaId: string]: string }>({});
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [areasList, setAreasList] = useState<any[]>([]);

  useEffect(() => {
    fetchBins();
    fetchTypes();
  }, []);

  const fetchBins = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ bins: BinItem[] }>('/bins/physical');
      if (response.success && response.data?.bins) {
        setBins(response.data.bins);
      }
    } catch (error) {
      showToast('Failed to fetch fleet data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const response = await api.get<{ binTypes: BinType[] }>('/bins/types');
      if (response.success && response.data) {
        setBinTypes(response.data.binTypes);
      }
    } catch (error) {
      console.error('Error fetching types:', error);
    }
  };

  const fetchSizes = async (typeId: number) => {
    setFetchingSizes(true);
    try {
      const response = await api.get<{ binSizes: BinSize[] }>(`/bins/sizes?typeId=${typeId}`);
      if (response.success && response.data) {
        setBinSizes(response.data.binSizes);
      }
    } catch (error) {
      console.error('Error fetching sizes:', error);
    } finally {
      setFetchingSizes(false);
    }
  };

  const fetchAreaPrices = async () => {
    if (!selectedTypeId) return;
    if (binSizes.length > 0 && !selectedSizeId) {
      setAreaPrices({});
      setAreasList([]);
      return;
    }

    setFetchingPrices(true);
    try {
      const query = selectedSizeId ? `?binSizeId=${selectedSizeId}` : '';
      const response = await api.get<{ areas: any[] }>(`/bins/supplier-prices/${selectedTypeId}${query}`);
      if (response.success && response.data?.areas) {
        setAreasList(response.data.areas);
        const prices: { [key: string]: string } = {};
        response.data.areas.forEach((area: any) => {
          const displayPrice = area.isActive ? area.adminPrice : area.currentPrice;
          prices[area.id] = displayPrice ? displayPrice.toString() : '';
        });
        setAreaPrices(prices);
      }
    } catch (error) {
      console.error('Error fetching area prices:', error);
    } finally {
      setFetchingPrices(false);
    }
  };

  useEffect(() => {
    if (selectedTypeId) {
      setSelectedSizeId('');
      setAreaPrices({});
      setAreasList([]);
      fetchSizes(parseInt(selectedTypeId));
    } else {
      setBinSizes([]);
    }
  }, [selectedTypeId]);

  useEffect(() => {
    fetchAreaPrices();
  }, [selectedTypeId, selectedSizeId, binSizes.length]);

  const handleAddNewBin = async (e: React.FormEvent) => {
    e.preventDefault();
    const typeNeedsSize = binSizes.length > 0;

    if (!selectedTypeId || (typeNeedsSize && !selectedSizeId)) {
      showToast(`Please select bin type${typeNeedsSize ? ' and size' : ''}`, 'error');
      return;
    }

    const validPrices = Object.entries(areaPrices)
      .filter(([_, price]) => price && parseFloat(price) > 0)
      .map(([areaId, price]) => ({
        service_area_id: parseInt(areaId),
        price: parseFloat(price)
      }));

    if (validPrices.length === 0) {
      showToast('Please enter a price for at least one service area', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/bins/physical', {
        bin_type_id: parseInt(selectedTypeId),
        bin_size_id: selectedSizeId ? parseInt(selectedSizeId) : null,
        notes: notes || undefined,
        area_prices: validPrices,
      });

      if (response.success) {
        showToast('Bin added successfully', 'success');
        setShowAddModal(false);
        setSelectedTypeId('');
        setSelectedSizeId('');
        setNotes('');
        setAreaPrices({});
        setAreasList([]);
        fetchBins();
      } else {
        showToast(response.message || 'Failed to process request', 'error');
      }
    } catch (error) {
      showToast('An error occurred while processing request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (binId: number, status: string) => {
    if (!confirm(`Are you sure you want to mark this bin as ${status}?`)) return;
    try {
      const response = await api.put(`/bins/physical/${binId}`, { status });
      if (response.success) {
        showToast(`Bin status updated to ${status}`, 'success');
        fetchBins();
      } else {
        showToast(response.message || 'Failed to update status', 'error');
      }
    } catch (error) {
      showToast('An error occurred while updating status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
          <p className="font-light" style={{ color: 'var(--color-text-secondary)' }}>Loading fleet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Fleet Management</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Manage your physical bins and track their locations</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center px-4 py-2"
            style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)', color: 'white', border: 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add New Bin
          </button>
        </div>

        <div className="dashboard-card rounded-lg p-6">
          {bins.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-700 mb-2">No physical bins added</h2>
              <p className="text-gray-500">Add physical bins to your fleet to fulfill customer orders</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bin Code</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Status</th>
                    <th>Current Location</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bins.map(bin => (
                    <tr key={bin.id}>
                      <td className="font-bold font-mono text-gray-800">{bin.bin_code}</td>
                      <td>{bin.bin_type_name}</td>
                      <td>{bin.bin_size || '-'}</td>
                      <td>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${bin.status === 'available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {bin.status.charAt(0).toUpperCase() + bin.status.slice(1)}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate" title={bin.current_location}>
                        {bin.current_location || '-'}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          {bin.status === 'available' ? (
                            <button
                              onClick={() => handleUpdateStatus(bin.id, 'unavailable')}
                              className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded hover:bg-red-100 font-medium"
                            >
                              Mark Unavailable
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(bin.id, 'available')}
                              className="text-xs bg-green-50 text-green-600 border border-green-200 px-3 py-1.5 rounded hover:bg-green-100 font-medium"
                            >
                              Mark Available
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Bin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold text-gray-800">Add Physical Bin</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="add-bin-form" onSubmit={handleAddNewBin} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Bin Type</label>
                  <div className="flex flex-wrap gap-2">
                    {binTypes.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedTypeId(type.id.toString())}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                          selectedTypeId === type.id.toString() 
                            ? 'bg-green-500 text-white border-green-500' 
                            : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {type.name}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedTypeId && binSizes.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Select Bin Size</label>
                    <div className="flex flex-wrap gap-2">
                      {binSizes.map(size => (
                        <button
                          key={size.id}
                          type="button"
                          onClick={() => setSelectedSizeId(size.id.toString())}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                            selectedSizeId === size.id.toString() 
                              ? 'bg-green-500 text-white border-green-500' 
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {size.size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {fetchingPrices && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    Loading pricing for service areas...
                  </div>
                )}

                {areasList.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Service Area Pricing <span className="text-red-500">*</span></label>
                    <p className="text-xs text-gray-500 mb-4">Set pricing for this bin across your service areas. At least one is required.</p>
                    
                    <div className="space-y-3">
                      {areasList.map(area => (
                        <div key={area.id} className="flex items-center justify-between bg-white p-3 rounded border border-gray-200">
                          <div>
                            <span className="font-medium text-gray-800">{area.city}</span>
                            {area.currentPrice && (
                              <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded ${area.isActive ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                {area.isActive ? 'Active' : 'Pending'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center relative w-32">
                            <span className="absolute left-3 text-gray-500 font-bold">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={areaPrices[area.id] || ''}
                              onChange={(e) => setAreaPrices(prev => ({ ...prev, [area.id]: e.target.value }))}
                              placeholder="0.00"
                              className="w-full pl-7 pr-3 py-1.5 border border-gray-300 rounded focus:border-green-500 outline-none text-right"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Serial number, color, condition..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 outline-none"
                    rows={3}
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-bin-form"
                disabled={submitting || fetchingSizes || fetchingPrices}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-md font-medium flex items-center disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Add Bin'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
