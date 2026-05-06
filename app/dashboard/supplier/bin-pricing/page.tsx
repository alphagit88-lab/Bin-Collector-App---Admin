'use client';

import { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BinType {
  id: number;
  name: string;
}

interface BinSize {
  id: number;
  size: string;
  bin_type_name: string;
  bin_type_id: number;
}

interface ServiceAreaBin {
  id?: number;
  bin_size_id: number | null;
  bin_type_id: number | null;
  bin_size_name: string | null;
  bin_type_name: string;
  supplier_price: string;
  admin_final_price: string | null;
  is_active: boolean;
}

function SupplierBinPricingContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const serviceAreaId = searchParams.get('serviceAreaId');
  const city = searchParams.get('city');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [binTypes, setBinTypes] = useState<BinType[]>([]);
  const [binSizes, setBinSizes] = useState<BinSize[]>([]);
  const [configuredBins, setConfiguredBins] = useState<ServiceAreaBin[]>([]);
  const [prices, setPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (serviceAreaId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [serviceAreaId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const typesRes = await api.get<{ binTypes: any[] }>('/bins/types');
      const sizesRes = await api.get<{ binSizes: any[] }>('/supplier/bin-sizes');
      const configRes = await api.get<{ bins: any[] }>(`/supplier/service-areas/${serviceAreaId}/bins`);

      if (typesRes.success && sizesRes.success && configRes.success && 
          typesRes.data && sizesRes.data && configRes.data) {
        
        setBinTypes(typesRes.data.binTypes);
        setBinSizes(sizesRes.data.binSizes);
        setConfiguredBins(configRes.data.bins);

        const initialPrices: Record<string, string> = {};
        configRes.data.bins.forEach((bin: any) => {
          const key = bin.bin_size_id ? `size_${bin.bin_size_id}` : `type_${bin.bin_type_id}`;
          initialPrices[key] = bin.supplier_price.toString();
        });
        setPrices(initialPrices);
      }
    } catch (error) {
      showToast('Failed to load pricing information.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (key: string, value: string) => {
    setPrices(prev => ({ ...prev, [key]: value }));
  };

  const handleSavePrice = async (typeId: number | null, sizeId: number | null) => {
    const key = sizeId ? `size_${sizeId}` : `type_${typeId}`;
    const price = prices[key];
    if (!price || isNaN(parseFloat(price))) {
      showToast('Please enter a valid price.', 'error');
      return;
    }

    try {
      setSaving(true);
      const response = await api.post('/supplier/service-area-bins/price', {
        serviceAreaId,
        binSizeId: sizeId,
        binTypeId: typeId,
        supplierPrice: parseFloat(price)
      });

      if (response.success) {
        showToast('Price suggestion submitted for admin approval.', 'success');
        fetchData();
      } else {
        showToast(response.message || 'Failed to update price.', 'error');
      }
    } catch (error) {
      showToast('An error occurred while saving price.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!serviceAreaId) {
    return (
      <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="max-w-7xl mx-auto text-center mt-20">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Select a Service Area</h2>
          <p className="text-gray-600 mb-8">You need to select a service area to configure its pricing.</p>
          <Link href="/dashboard/supplier/operations/service-area" className="btn btn-primary px-6 py-2 rounded-md">
            Go to Service Areas
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
          <p className="font-light" style={{ color: 'var(--color-text-secondary)' }}>Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>Bin Pricing</h1>
            <p style={{ color: 'var(--color-text-secondary)' }}>Configure pricing for {city}</p>
          </div>
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-8 flex items-start">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-3 flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <p className="text-sm">Set your suggested price for each bin type. Admin will review and set the final active price.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {binTypes.map(type => {
            const sizesForType = binSizes.filter(s => s.bin_type_name === type.name || s.bin_type_id === type.id);
            
            const itemsToRender = sizesForType.length > 0 
              ? sizesForType.map(s => ({ type, size: s }))
              : [{ type, size: undefined }];

            return itemsToRender.map((item, index) => {
              const isSizeBased = !!item.size;
              const key = isSizeBased ? `size_${item.size!.id}` : `type_${item.type.id}`;
              
              const config = configuredBins.find(b => 
                isSizeBased ? b.bin_size_id === item.size!.id : (b.bin_type_id === item.type.id && !b.bin_size_id)
              );
              const currentPrice = prices[key] || '';
              const isLocked = !!config?.admin_final_price;

              return (
                <div key={key} className="dashboard-card rounded-lg p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{item.type.name}</h3>
                      {isSizeBased && <p className="text-gray-500 font-medium">{item.size!.size}</p>}
                      
                      {config && (
                        <div className="mt-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-md ${config.is_active ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                            {config.is_active ? 'Active' : 'Pending Approval'}
                          </span>
                          
                          {config.admin_final_price && (
                            <div className="mt-2 bg-blue-50 border border-blue-100 text-blue-800 text-xs px-2 py-1 rounded inline-block">
                              <span className="font-medium mr-1">Customer Price:</span>
                              <span className="font-bold">${config.admin_final_price}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <div className={`flex items-center border rounded-md px-3 py-2 flex-1 ${isLocked ? 'bg-gray-100 border-gray-200' : 'bg-white border-gray-300'}`}>
                      <span className={`font-bold mr-2 ${isLocked ? 'text-gray-400' : 'text-gray-600'}`}>$</span>
                      <input 
                        type="number"
                        className={`w-full outline-none font-semibold ${isLocked ? 'text-gray-400 bg-transparent' : 'text-gray-800'}`}
                        placeholder="0.00"
                        value={currentPrice}
                        onChange={(e) => handlePriceChange(key, e.target.value)}
                        disabled={isLocked}
                      />
                    </div>
                    <button
                      onClick={() => handleSavePrice(item.type.id, isSizeBased ? item.size!.id : null)}
                      disabled={saving || isLocked}
                      className={`px-4 py-2 rounded-md font-semibold text-white flex items-center justify-center min-w-[48px] ${isLocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600 cursor-pointer'}`}
                    >
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {isLocked ? (
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          ) : (
                            <polyline points="20 6 9 17 4 12"></polyline>
                          )}
                          {isLocked && <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>}
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

export default function SupplierBinPricingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SupplierBinPricingContent />
    </Suspense>
  );
}
