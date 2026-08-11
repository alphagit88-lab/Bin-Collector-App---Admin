'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, API_BASE_URL } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { GoogleMap, Marker, Autocomplete, useJsApiLoader } from '@react-google-maps/api';

interface ServiceCategory {
  id: number;
  name: string;
  description: string;
}

const GOOGLE_LIBRARIES: any[] = ["places"];

export default function CustomerOrderPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  // Basic Flow State
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState<'residential' | 'commercial' | 'service'>('residential');

  // Location State
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 43.6532, lng: -79.3832 });
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [availableBins, setAvailableBins] = useState<any[]>([]);
  const [binSizesMap, setBinSizesMap] = useState<Record<number, any[]>>({});
  const [availableServices, setAvailableServices] = useState<ServiceCategory[]>([]);
  const [selectedBins, setSelectedBins] = useState<any[]>([{ typeId: '', sizeId: '', quantity: '1' }]);
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [customerBudget, setCustomerBudget] = useState('');

  // Order Details
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contactNumber, setContactNumber] = useState(user?.phone || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [instructions, setInstructions] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);

  // Commercial Specific
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [poNumber, setPoNumber] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cash'>('online');
  const [estimatedPrice, setEstimatedPrice] = useState<{ base_price: number, subtotal: number, total: number, gst_amount: number, gst_rate: number, duration_days: number | null, additional_duration_charge: number, exceeded_days: number | null } | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [splitOrders, setSplitOrders] = useState<any[] | null>(null);
  const [assignedSupplierId, setAssignedSupplierId] = useState<string | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || '',
    libraries: GOOGLE_LIBRARIES
  });

  useEffect(() => {
    // Load default location if available
    const rawLoc = localStorage.getItem('defaultLocation');
    if (rawLoc && !location) {
      try {
        const parsed = JSON.parse(rawLoc);
        setLocation(parsed.address || rawLoc);
        if (parsed.lat && parsed.lng) {
          setLatitude(parsed.lat);
          setLongitude(parsed.lng);
          setMapCenter({ lat: parsed.lat, lng: parsed.lng });
        }
      } catch {
        setLocation(rawLoc);
      }
    }

    if (user?.role === 'customer') {
      api.get<{ projects: any[] }>('/projects/my').then(res => {
        if (res.success && res.data) setProjects(res.data.projects || []);
      });
    }
  }, [user]);

  // When location/category changes, fetch available bins or services
  useEffect(() => {
    if (step === 2 && latitude && longitude) {
      if (category === 'service') {
        fetchServices();
      } else {
        fetchBins();
      }
    }
  }, [step, latitude, longitude, category]);

  const fetchBins = async () => {
    try {
      const res = await api.get<{ binTypes: any[] }>(`/bins/available-types?lat=${latitude}&lon=${longitude}`);
      if (res.success && res.data) {
        setAvailableBins(res.data.binTypes || []);
      }
    } catch {
      showToast('Failed to load available bins for this location', 'error');
    }
  };

  const fetchBinSizes = async (typeId: number) => {
    if (binSizesMap[typeId]) return; // Already fetched
    try {
      const res = await api.get<{ binSizes: any[] }>(`/bins/available-sizes?lat=${latitude}&lon=${longitude}&binTypeId=${typeId}`);
      if (res.success && res.data) {
        setBinSizesMap(prev => ({ ...prev, [typeId]: res.data?.binSizes || [] }));
      }
    } catch {
      showToast('Failed to load sizes for this bin type', 'error');
    }
  };

  const fetchServices = async () => {
    try {
      const res = await api.get<{ categories: ServiceCategory[] }>(`/service-categories`);
      if (res.success && res.data) {
        setAvailableServices(res.data.categories || []);
      }
    } catch {
      showToast('Failed to load services for this location', 'error');
    }
  };

  const handlePlaceSelect = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place && place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setLatitude(lat);
        setLongitude(lng);
        setMapCenter({ lat, lng });
        setLocation(place.formatted_address || place.name || '');
      }
    }
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setLatitude(lat);
    setLongitude(lng);

    if (typeof window !== 'undefined' && window.google) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          setLocation(results[0].formatted_address);
        }
      });
    }
  };

  const calculateEstimate = async () => {
    // Mirror mobile app: skip for 'service' type
    // For residential, dates are required. For commercial, dates are not required.
    if (
      category === 'service' ||
      !selectedBins.some(b => b.typeId && b.sizeId) ||
      !latitude || !longitude ||
      (category === 'residential' && (!startDate || !endDate))
    ) {
      setEstimatedPrice(null);
      setEstimateError(null);
      return;
    }
    setLoadingEstimate(true);
    setEstimateError(null);
    setEstimatedPrice(null);
    setSplitOrders(null);
    setAssignedSupplierId(null);
    try {
      const payload: any = {
        service_category: category,
        start_date: startDate || null,
        end_date: endDate || null,
        lat: latitude,
        lng: longitude,
        bins: selectedBins.filter(b => b.typeId && b.sizeId).map(b => ({
          bin_type_id: b.typeId,
          bin_size_id: b.sizeId,
          quantity: b.quantity || '1'
        }))
      };

      const res = await api.post<any>('/bookings/calculate-price', payload);
      if (res.success && res.data) {
        setEstimatedPrice({
          base_price: res.data.base_price || 0,
          subtotal: res.data.subtotal || 0,
          total: res.data.total || 0,
          gst_amount: res.data.gst_amount || 0,
          gst_rate: res.data.gst_rate || 0,
          duration_days: res.data.duration_days || null,
          additional_duration_charge: res.data.additional_duration_charge || 0,
          exceeded_days: res.data.exceeded_days || null
        });
        setSplitOrders(res.data.splits || null);
        setAssignedSupplierId(res.data.supplier_id || null);
      } else {
        setEstimateError(res.message || 'No suppliers available for this selection.');
      }
    } catch (e) {
      console.error(e);
      setEstimateError('Failed to calculate price. Please try again.');
    } finally {
      setLoadingEstimate(false);
    }
  };

  useEffect(() => {
    if (step === 3) {
      calculateEstimate();
    }
  }, [step, startDate, endDate, selectedBins, selectedServices, latitude, longitude, category]);

  const handleSubmit = async () => {
    if (!latitude || !longitude) {
      showToast('Please complete all required fields', 'error');
      return;
    }
    // Dates required for non-commercial (mirrors mobile app)
    if (category !== 'commercial' && (!startDate || !endDate)) {
      showToast('Please select service dates', 'error');
      return;
    }

    if (category === 'service' && (!customerBudget)) {
      showToast('Please enter your budget', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('service_category', category);
      formData.append('location', location);
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());
      if (startDate) formData.append('start_date', startDate);
      if (endDate) formData.append('end_date', endDate);
      formData.append('contact_number', contactNumber);
      formData.append('contact_email', contactEmail);
      formData.append('instructions', instructions);
      formData.append('payment_method', paymentMethod);

      if (category === 'commercial') {
        if (selectedProject) formData.append('project_id', selectedProject);
        if (poNumber) formData.append('po_number', poNumber);
      }

      if (category === 'service') {
        formData.append('selected_services', JSON.stringify(selectedServices.filter(id => id)));
        formData.append('estimated_price', customerBudget);
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        const response = await api.post('/bookings', formData);
        if (response.success) {
          showToast('Order created successfully!', 'success');
          router.push('/dashboard/customer/bookings');
        } else {
          showToast(response.message || 'Failed to create order', 'error');
        }
      } else {
        if (splitOrders && splitOrders.length > 0) {
          const promises = splitOrders.map(split => {
            const splitFormData = new FormData();
            splitFormData.append('service_category', category);
            splitFormData.append('location', location);
            splitFormData.append('latitude', latitude.toString());
            splitFormData.append('longitude', longitude.toString());
            if (startDate) splitFormData.append('start_date', startDate);
            if (endDate) splitFormData.append('end_date', endDate);
            splitFormData.append('contact_number', contactNumber);
            splitFormData.append('contact_email', contactEmail);
            splitFormData.append('instructions', instructions);
            splitFormData.append('payment_method', paymentMethod);
            if (category === 'commercial') {
              if (selectedProject) splitFormData.append('project_id', selectedProject);
              if (poNumber) splitFormData.append('po_number', poNumber);
            }
            if (split.supplier_id) splitFormData.append('supplier_id', split.supplier_id.toString());
            splitFormData.append('bins', JSON.stringify(split.items));
            attachments.forEach((file) => splitFormData.append('attachments', file));
            return api.post('/bookings', splitFormData);
          });

          const results = await Promise.all(promises);
          const anyFailed = results.some(r => !r.success);
          if (anyFailed) {
            showToast('Some split orders failed to create. Please check your bookings.', 'error');
          } else {
            showToast(`Successfully created ${splitOrders.length} separated orders!`, 'success');
            router.push('/dashboard/customer/bookings');
          }
        } else {
          const mappedBins = selectedBins.filter(b => b.typeId && b.sizeId).map(b => ({
            bin_type_id: b.typeId,
            bin_size_id: b.sizeId,
            quantity: b.quantity || '1'
          }));
          formData.append('bins', JSON.stringify(mappedBins));
          if (assignedSupplierId) {
            formData.append('supplier_id', assignedSupplierId);
          }
          attachments.forEach((file) => {
            formData.append('attachments', file);
          });

          const response = await api.post('/bookings', formData);
          if (response.success) {
            showToast('Order created successfully!', 'success');
            router.push('/dashboard/customer/bookings');
          } else {
            showToast(response.message || 'Failed to create order', 'error');
          }
        }
      }
    } catch (error) {
      showToast('An error occurred during submission', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!latitude || !longitude) {
        showToast('Please select a valid location', 'error');
        return;
      }
    } else if (step === 2) {
      if (category === 'service' && selectedServices.length === 0) {
        showToast('Please select at least one service', 'error');
        return;
      }
      if (category !== 'service' && (!selectedBins[0].typeId || !selectedBins[0].sizeId)) {
        showToast('Please complete bin selection', 'error');
        return;
      }
      if (category === 'service' && (!customerBudget)) {
        showToast('Please enter your budget', 'error');
        return;
      }
      // Dates only required for non-commercial (mirrors mobile app)
      if (category !== 'commercial' && (!startDate || !endDate)) {
        showToast('Please select service dates', 'error');
        return;
      }
    }
    setStep(step + 1);
  };

  const addBinRow = () => setSelectedBins([...selectedBins, { typeId: '', sizeId: '', quantity: '1' }]);
  const removeBinRow = (index: number) => {
    if (selectedBins.length > 1) {
      const newBins = [...selectedBins];
      newBins.splice(index, 1);
      setSelectedBins(newBins);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Order New Bin</h1>
          <p className="text-gray-500 mt-1">Complete the steps below to place your order</p>
        </div>

        {/* Progress Stepper */}
        <div className="mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          {[
            { num: 1, label: 'Location' },
            { num: 2, label: 'Details' },
            { num: 3, label: 'Review & Pay' }
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center flex-1 relative z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${step >= s.num ? 'bg-green-500 text-white shadow-md shadow-green-200' : 'bg-gray-100 text-gray-400'
                  }`}>
                  {step > s.num ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : s.num}
                </div>
                <span className={`text-xs mt-2 font-medium ${step >= s.num ? 'text-gray-900' : 'text-gray-400'}`}>{s.label}</span>
              </div>
              {i < 2 && (
                <div className="flex-1 h-1 bg-gray-100 rounded -mx-4 z-0 relative top-[-10px]">
                  <div className="h-full bg-green-500 rounded transition-all duration-300" style={{ width: step > s.num ? '100%' : '0%' }}></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">

          {/* Step 1: Location & Category */}
          {step === 1 && (
            <div className="p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">What type of service do you need?</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  { id: 'residential', label: 'Residential', icon: '🏠' },
                  { id: 'commercial', label: 'Commercial', icon: '🏢' },
                  { id: 'service', label: 'Other Service', icon: '🛠️' }
                ].map(cat => (
                  <button key={cat.id} onClick={() => setCategory(cat.id as any)}
                    className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${category === cat.id ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-green-200 bg-white'}`}>
                    <span className="text-3xl">{cat.icon}</span>
                    <span className={`font-semibold ${category === cat.id ? 'text-green-700' : 'text-gray-700'}`}>{cat.label}</span>
                  </button>
                ))}
              </div>

              {category === 'commercial' && (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Assign to Project (Optional)</h2>
                  <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="">No Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-900 mb-4">Where do you need it?</h2>
              {isLoaded ? (
                <>
                  <div className="mb-4">
                    <Autocomplete onLoad={ref => autocompleteRef.current = ref} onPlaceChanged={handlePlaceSelect}>
                      <div className="relative">
                        <svg className="w-5 h-5 absolute left-4 top-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <input type="text" placeholder="Search for your address..." value={location} onChange={e => setLocation(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                    </Autocomplete>
                  </div>
                  <div className="h-[350px] rounded-xl overflow-hidden border border-gray-200">
                    <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={mapCenter} zoom={latitude && longitude ? 14 : 10} onClick={handleMapClick} options={{ streetViewControl: false, mapTypeControl: false }}>
                      {latitude && longitude && <Marker position={{ lat: latitude, lng: longitude }} />}
                    </GoogleMap>
                  </div>
                </>
              ) : (
                <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">Loading Map...</div>
              )}
            </div>
          )}

          {/* Step 2: Details & Dates */}
          {step === 2 && (
            <div className="p-6 md:p-8 space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Select {category === 'service' ? 'Services' : 'Bins'}</h2>
                {category === 'service' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableServices.map(s => (
                      <label key={s.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${selectedServices.includes(s.id) ? 'border-green-500 bg-green-50' : 'border-gray-100 hover:border-green-200'}`}>
                        <input type="checkbox" checked={selectedServices.includes(s.id)} onChange={(e) => {
                          if (e.target.checked) setSelectedServices([...selectedServices, s.id]);
                          else setSelectedServices(selectedServices.filter(id => id !== s.id));
                        }} className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
                        <span className="font-medium text-gray-900">{s.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedBins.map((bin, index) => {
                      const typeIdNum = Number(bin.typeId);
                      const sizes = binSizesMap[typeIdNum] || [];
                      return (
                        <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bin Type</label>
                            <select value={bin.typeId} onChange={e => {
                              const newTypeId = e.target.value;
                              const newBins = [...selectedBins];
                              newBins[index].typeId = newTypeId;
                              newBins[index].sizeId = '';
                              setSelectedBins(newBins);
                              if (newTypeId) {
                                fetchBinSizes(Number(newTypeId));
                              }
                            }}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                              <option value="">Select Type</option>
                              {availableBins.map(t => {
                                const availableSizes = binSizesMap[t.id] || [];
                                let isTypeDisabled = false;
                                if (availableSizes.length > 0) {
                                  isTypeDisabled = availableSizes.every(s =>
                                    selectedBins.some((b, i) => i !== index && b.typeId === t.id.toString() && b.sizeId === s.id.toString())
                                  );
                                } else {
                                  isTypeDisabled = selectedBins.some((b, i) => i !== index && b.typeId === t.id.toString());
                                }
                                return (
                                  <option key={t.id} value={t.id} disabled={isTypeDisabled}>
                                    {t.name} {isTypeDisabled ? '(All Sizes Selected)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Bin Size</label>
                            <select value={bin.sizeId} onChange={e => {
                              const newBins = [...selectedBins];
                              newBins[index].sizeId = e.target.value;
                              setSelectedBins(newBins);
                            }} disabled={!bin.typeId}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50">
                              <option value="">Select Size</option>
                              {sizes.map((s: any) => {
                                const isSizeDisabled = selectedBins.some((b, i) =>
                                  i !== index && b.typeId === bin.typeId && b.sizeId === s.id.toString()
                                );
                                return (
                                  <option key={s.id} value={s.id} disabled={isSizeDisabled}>
                                    {s.size} {isSizeDisabled ? '(Already Selected)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="w-full sm:w-24">
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Qty</label>
                            <input type="number" min="1" value={bin.quantity || '1'} onChange={e => {
                              const newBins = [...selectedBins];
                              newBins[index].quantity = e.target.value;
                              setSelectedBins(newBins);
                            }}
                              className="w-full p-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
                          </div>
                          {selectedBins.length > 1 && (
                            <button onClick={() => removeBinRow(index)} className="self-end p-2.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors mb-[2px]">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                    <button onClick={addBinRow} className="text-green-600 font-semibold text-sm hover:underline flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      Add Another Bin
                    </button>
                  </div>
                )}
              </div>

              {category === 'service' && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Price Estimation</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price (Your Budget - $) *
                      </label>
                      <input type="number" value={customerBudget} onChange={e => setCustomerBudget(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">When do you need it?</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {category !== 'commercial' ? 'Start Date *' : 'Start Date'}
                    </label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {category !== 'commercial' ? 'End Date *' : 'End Date'}
                    </label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* Step 3: Review & Pay */}
          {step === 3 && (
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input type="tel" value={contactNumber} onChange={e => setContactNumber(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                        <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 mb-4" />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">PO Number (Optional)</label>
                      <input type="text" value={poNumber} onChange={e => setPoNumber(e.target.value)} placeholder="e.g. PO-12345"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>

                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Additional Info</h2>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions</label>
                    <textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={3} placeholder="Gate codes, placement instructions, etc."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none mb-4" />

                    <label className="block text-sm font-medium text-gray-700 mb-1">Attachments (Photos)</label>
                    <input type="file" multiple accept="image/*" onChange={e => {
                      if (e.target.files) {
                        setAttachments(prev => [...prev, ...Array.from(e.target.files as FileList)]);
                      }
                    }}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100" />
                    {attachments.length > 0 && (
                      <div className="flex gap-2 flex-wrap mt-3">
                        {attachments.map((file, i) => (
                          <div key={i} className="relative group">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                              <img src={URL.createObjectURL(file)} alt="attachment" className="w-full h-full object-cover" />
                            </div>
                            <button onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:w-80 space-y-6">
                  {/* Payment Method Card */}
                  {category !== 'commercial' && (
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h3 className="font-bold text-gray-900 mb-4">Payment Method</h3>
                      <div className="space-y-3">
                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'online' ? 'border-green-500 bg-white shadow-sm' : 'border-gray-200 hover:border-green-200 bg-white'}`}>
                          <input type="radio" name="payment" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                          <span className="font-medium text-sm text-gray-900">Credit Card (Online)</span>
                        </label>
                        <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'cash' ? 'border-green-500 bg-white shadow-sm' : 'border-gray-200 hover:border-green-200 bg-white'}`}>
                          <input type="radio" name="payment" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="w-4 h-4 text-green-600 focus:ring-green-500" />
                          <span className="font-medium text-sm text-gray-900">Cash on Delivery</span>
                        </label>
                      </div>
                      <p className="text-xs text-gray-500 mt-4 text-center">Payment will be processed when order is confirmed</p>
                    </div>
                  )}

                  {/* Order Summary Card — shown when enough data exists (mirrors mobile) */}
                  {(category !== 'service' && selectedBins.some(b => b.typeId && b.sizeId) && latitude && longitude && (category === 'commercial' || (startDate && endDate))) && (
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                      <h3 className="font-bold text-gray-900 mb-4">Order Summary</h3>

                      {splitOrders && splitOrders.length > 0 && (
                        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm">
                          <p className="font-semibold mb-1">Notice: Separated Orders Required</p>
                          <p>The selected bins are not all available from a single supplier in this location. Your request will be processed as <strong>{splitOrders.length} separated orders</strong> to fulfill all items.</p>
                        </div>
                      )}

                      {loadingEstimate ? (
                        <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
                      ) : estimatedPrice ? (
                        <>
                          {splitOrders && splitOrders.length > 0 ? (
                            <div className="space-y-4">
                              {splitOrders.map((split, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-sm">
                                  <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Order {idx + 1}</h4>
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between text-gray-600">
                                      <span>Service</span>
                                      <span className="font-medium text-gray-900 capitalize">{category}</span>
                                    </div>
                                    {startDate && endDate && (
                                      <div className="flex justify-between text-gray-600">
                                        <span>Dates</span>
                                        <span className="font-medium text-gray-900">{new Date(startDate).toLocaleDateString()} – {new Date(endDate).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    {category !== 'commercial' && estimatedPrice.duration_days && (
                                      <div className="flex justify-between text-gray-600">
                                        <span>Duration</span>
                                        <span className="font-medium text-gray-900">{estimatedPrice.duration_days} day(s)</span>
                                      </div>
                                    )}
                                    {category !== 'commercial' && (
                                      <div className="flex justify-between text-gray-600">
                                        <span>Base Price</span>
                                        <span className="font-medium text-gray-900">${split.base_price?.toFixed(2) || '0.00'}</span>
                                      </div>
                                    )}
                                    {category !== 'commercial' && (split.additional_duration_charge > 0) && (
                                      <div className="flex justify-between text-red-500">
                                        <span>Extra Days - {estimatedPrice.exceeded_days} day(s)</span>
                                        <span className="font-medium">+${split.additional_duration_charge.toFixed(2)}</span>
                                      </div>
                                    )}
                                    {category !== 'commercial' && (
                                      <>
                                        <div className="flex justify-between text-gray-600">
                                          <span>Subtotal</span>
                                          <span className="font-medium text-gray-900">${split.subtotal?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600">
                                          <span>GST ({estimatedPrice.gst_rate}%)</span>
                                          <span className="font-medium text-gray-900">${split.gst_amount?.toFixed(2) || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-gray-800 pt-2 border-t mt-1">
                                          <span>Order Total</span>
                                          <span>${split.total?.toFixed(2) || '0.00'}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}

                              <div className="flex justify-between items-center pt-4 border-t border-gray-300">
                                <span className="font-bold text-gray-900">{category === 'commercial' ? 'Pricing' : 'Grand Total'}</span>
                                {category === 'commercial' ? (
                                  <span className="font-bold text-sm text-gray-500 italic">Quoted on Invoice</span>
                                ) : (
                                  <span className="font-black text-2xl text-green-600">${estimatedPrice.total.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-2 mb-4 pb-4 border-b border-gray-200 text-sm">
                                <div className="flex justify-between text-gray-600">
                                  <span>Service</span>
                                  <span className="font-medium text-gray-900 capitalize">{category}</span>
                                </div>
                                {startDate && endDate && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>Dates</span>
                                    <span className="font-medium text-gray-900">{new Date(startDate).toLocaleDateString()} – {new Date(endDate).toLocaleDateString()}</span>
                                  </div>
                                )}
                                {/* Duration breakdown — non-commercial only, mirrors mobile */}
                                {category !== 'commercial' && estimatedPrice.duration_days && (
                                  <div className="flex justify-between text-gray-600">
                                    <span>Duration</span>
                                    <span className="font-medium text-gray-900">{estimatedPrice.duration_days} day(s)</span>
                                  </div>
                                )}
                                {category !== 'commercial' && (estimatedPrice.additional_duration_charge ?? 0) > 0 && (
                                  <div className="flex justify-between text-red-500">
                                    <span>Extra Days - {estimatedPrice.exceeded_days} day(s)</span>
                                    <span className="font-medium">+${estimatedPrice.additional_duration_charge.toFixed(2)}</span>
                                  </div>
                                )}
                                {category !== 'commercial' && (
                                  <>
                                    <div className="flex justify-between text-gray-600">
                                      <span>Subtotal</span>
                                      <span className="font-medium text-gray-900">${estimatedPrice.subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                      <span>GST ({estimatedPrice.gst_rate}%)</span>
                                      <span className="font-medium text-gray-900">${estimatedPrice.gst_amount.toFixed(2)}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-gray-900">{category === 'commercial' ? 'Pricing' : 'Estimated Total'}</span>
                                {category === 'commercial' ? (
                                  <span className="font-bold text-sm text-gray-500 italic">Quoted on Invoice</span>
                                ) : (
                                  <span className="font-black text-2xl text-green-600">${estimatedPrice.total.toFixed(2)}</span>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      ) : estimateError ? (
                        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                          <span>{estimateError}</span>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-4">Calculating price...</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="p-4 md:p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} className="px-6 py-2.5 text-gray-700 font-semibold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Back
              </button>
            ) : <div></div>}

            {step < 3 ? (
              <button onClick={handleNext} className="px-8 py-2.5 text-white font-semibold rounded-xl transition-all hover:opacity-90 shadow-md" style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}>
                Next Step
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting || (!!estimateError && category !== 'service')} className="px-8 py-2.5 text-white font-bold rounded-xl transition-all hover:opacity-90 shadow-md disabled:opacity-50 disabled:cursor-not-allowed" style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}>
                {submitting ? 'Processing...' : (category !== 'commercial' && paymentMethod === 'online') ? 'Place Order & Pay' : 'Place Order'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
