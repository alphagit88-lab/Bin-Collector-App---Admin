'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem'
};

const defaultCenter = {
  lat: 45.4215,
  lng: -75.6972
};

interface BinType {
  id: number;
  name: string;
}

interface BinSize {
  id: number;
  size: string;
  bin_type_id: number;
}

interface SelectedBin {
  bin_type_id: number;
  bin_size_id: number | null;
  quantity: number;
  price: string;
}

interface ServiceCategory {
  id: number;
  name: string;
}

export default function CreateOrderPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [serviceCategory, setServiceCategory] = useState('residential');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Bin Selection State
  const [binTypes, setBinTypes] = useState<BinType[]>([]);
  const [binSizes, setBinSizes] = useState<BinSize[]>([]);
  const [selectedBins, setSelectedBins] = useState<SelectedBin[]>([
    { bin_type_id: 0, bin_size_id: null, quantity: 1, price: '' }
  ]);

  // Service Mode State
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [totalPrice, setTotalPrice] = useState('');
  const [binPrices, setBinPrices] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({});
  const [fetchingSettings, setFetchingSettings] = useState(true);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [typesRes, sizesRes, categoriesRes, settingsRes] = await Promise.all([
        api.get<{ binTypes: BinType[] }>('/bins/supplier/types'),
        api.get<{ binSizes: BinSize[] }>('/bins/supplier/sizes'),
        api.get<{ categories: ServiceCategory[] }>('/service-categories'),
        api.get<{ settings: any[] }>('/settings')
      ]);

      if (typesRes.success && typesRes.data) {
        setBinTypes(typesRes.data.binTypes);
      }
      if (sizesRes.success && sizesRes.data) {
        setBinSizes(sizesRes.data.binSizes);
      }
      if (categoriesRes.success && categoriesRes.data) {
        setServiceCategories(categoriesRes.data.categories);
      }
      if (settingsRes.success && settingsRes.data) {
        const settingsMap: Record<string, string> = {};
        settingsRes.data.settings.forEach((s: any) => {
          settingsMap[s.key] = s.value;
        });
        setSystemSettings(settingsMap);
      }
    } catch (error) {
      showToast('Failed to load initial data', 'error');
    } finally {
      setFetchingData(false);
      setFetchingSettings(false);
    }
  };

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setLatitude(lat);
    setLongitude(lng);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'BinDropAppWeb/1.0' } }
      );
      const data = await response.json();
      if (data && data.display_name) {
        setLocation(data.display_name);
        fetchBinPrices(lat, lng);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  const fetchBinPrices = async (lat: number, lon: number) => {
    try {
      const response = await api.get<{ prices: any[] }>(`/bins/prices?lat=${lat}&lon=${lon}`);
      if (response.success && response.data) {
        setBinPrices(response.data.prices);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  useEffect(() => {
    // Update individual bin prices when binPrices (from location) changes
    if (binPrices.length > 0) {
      const updatedBins = selectedBins.map(bin => {
        if (bin.bin_size_id) {
          const priceObj = binPrices.find(p => p.bin_size_id === bin.bin_size_id);
          if (priceObj) {
            return { ...bin, price: priceObj.admin_final_price.toString() };
          }
        }
        return bin;
      });
      setSelectedBins(updatedBins);
    }
  }, [binPrices]);

  const handleSearchAddress = async () => {
    if (!location) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&countrycodes=ca`,
        { headers: { 'User-Agent': 'BinDropAppWeb/1.0' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLon = parseFloat(data[0].lon);
        setLatitude(newLat);
        setLongitude(newLon);
        setMapCenter({ lat: newLat, lng: newLon });
        setLocation(data[0].display_name);
        fetchBinPrices(newLat, newLon);
      } else {
        // Fallback for when location is entered but not specifically searched on map
        // Supplier can still create the order with just the location string
      }
    } catch (error) {
      console.error('Failed to search location:', error);
    }
  };

  const addBinRow = () => {
    setSelectedBins([...selectedBins, { bin_type_id: 0, bin_size_id: null, quantity: 1, price: '' }]);
  };

  const removeBinRow = (index: number) => {
    if (selectedBins.length === 1) return;
    const newBins = [...selectedBins];
    newBins.splice(index, 1);
    setSelectedBins(newBins);
  };

  const updateBinRow = (index: number, field: keyof SelectedBin, value: any) => {
    const newBins = [...selectedBins];
    newBins[index] = { ...newBins[index], [field]: value };
    
    if (field === 'bin_type_id') {
      newBins[index].bin_size_id = null;
      newBins[index].price = '';
    }

    if (field === 'bin_size_id' || field === 'bin_type_id') {
      const sizeId = field === 'bin_size_id' ? value : null;
      if (sizeId) {
        const priceObj = binPrices.find(p => p.bin_size_id === sizeId);
        if (priceObj) {
          newBins[index].price = priceObj.admin_final_price.toString();
        }
      }
    }

    setSelectedBins(newBins);
  };

  const calculateBreakdown = () => {
    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    const commercialLimit = systemSettings['commercial_duration_limit'];
    const residentialLimit = systemSettings['residential_duration_limit'];
    const dailyRateStr = systemSettings['additional_day_charge'];

    if (!commercialLimit || !residentialLimit || !dailyRateStr) return null;

    const limitDays = serviceCategory === 'commercial' ? parseInt(commercialLimit) : parseInt(residentialLimit);
    const dailyRate = parseFloat(dailyRateStr);

    const exceededDays = durationDays > limitDays ? durationDays - limitDays : 0;
    const additionalCharge = exceededDays * dailyRate;

    const basePrice = selectedBins.reduce((acc, b) => {
      const price = binPrices.find(p => p.bin_size_id === b.bin_size_id)?.admin_final_price;
      return acc + (parseFloat(price || '0') * (b.quantity || 1));
    }, 0);

    return {
      durationDays,
      limitDays,
      exceededDays,
      dailyRate,
      additionalCharge,
      basePrice,
      total: basePrice + additionalCharge
    };
  };

  const breakdown = calculateBreakdown();

  const toggleService = (id: number) => {
    if (selectedServices.includes(id)) {
      setSelectedServices(selectedServices.filter(s => s !== id));
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerPhone || !location || !startDate || !endDate) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const body = {
        customer_name: customerName,
        customer_phone: customerPhone,
        service_category: serviceCategory,
        bins: selectedBins.map(b => ({
          bin_type_id: b.bin_type_id,
          bin_size_id: b.bin_size_id,
          quantity: b.quantity,
          price: b.price || '0',
        })),
        location,
        latitude,
        longitude,
        start_date: startDate,
        end_date: endDate,
        instructions,
        payment_method: 'cash'
      };

      const response = await api.post('/bookings/supplier/create', body);

      if (response.success) {
        showToast(response.message || 'Order created successfully', 'success');
        router.push('/dashboard/supplier/jobs');
      } else {
        showToast(response.message || 'Failed to create order', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Create New Order</h1>
            <p className="text-gray-600">Assign an order to a new or existing customer</p>
          </div>
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Customer Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="e.g. 0771234567"
                  required
                />
              </div>
            </div>
          </div>

          {/* Order Configuration */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
              Order Details
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Category*</label>
              <div className="flex gap-2">
                {['residential', 'commercial', 'service'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setServiceCategory(cat)}
                    className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                      serviceCategory === cat 
                        ? 'border-green-500 bg-green-50 text-green-700 font-bold' 
                        : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200'
                    }`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {serviceCategory !== 'service' ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bins & Pricing*</label>
                {selectedBins.map((bin, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 relative">
                    <div className="flex-1 min-w-[150px]">
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Type</label>
                      <select
                        value={bin.bin_type_id}
                        onChange={(e) => updateBinRow(index, 'bin_type_id', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-md text-sm outline-none"
                      >
                        <option value={0}>Select Type</option>
                        {binTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    {(!bin.bin_type_id || binSizes.some(s => s.bin_type_id === bin.bin_type_id)) && (
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Size</label>
                        <select
                          value={bin.bin_size_id || ''}
                          onChange={(e) => updateBinRow(index, 'bin_size_id', e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border rounded-md text-sm outline-none"
                          disabled={!bin.bin_type_id}
                        >
                          <option value="">Select Size</option>
                          {binSizes.filter(s => s.bin_type_id === bin.bin_type_id).map(s => (
                            <option key={s.id} value={s.id}>{s.size}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className="w-20">
                      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={bin.quantity}
                        onChange={(e) => updateBinRow(index, 'quantity', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border rounded-md text-sm outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBinRow(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addBinRow}
                  className="text-green-600 font-semibold text-sm flex items-center hover:text-green-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  Add Another Bin
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Select Services*</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {serviceCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => toggleService(category.id)}
                        className={`flex items-center p-3 rounded-lg border transition-all ${
                          selectedServices.includes(category.id)
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border mr-2 flex items-center justify-center ${
                          selectedServices.includes(category.id) ? 'bg-green-500 border-green-500' : 'bg-white'
                        }`}>
                          {selectedServices.includes(category.id) && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          )}
                        </div>
                        <span className="text-sm font-medium">{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Description*</label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Enter additional service details..."
                    rows={3}
                    required
                  />
                </div>
                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Price ($)*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none font-bold text-lg"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location & Map */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              Location Selection
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Enter full address"
                  required
                />
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  className="bg-gray-100 hover:bg-gray-200 px-4 rounded-md border text-sm font-medium transition-colors"
                >
                  Locate
                </button>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-xs text-gray-500 italic">
                Tip: You can use the map below to pinpoint the exact delivery location if needed, but it's optional.
              </p>
            </div>

            <div className="h-[300px] bg-gray-100 rounded-md overflow-hidden relative">
              {!isLoaded ? (
                <div className="flex items-center justify-center h-full text-gray-500">Loading Map...</div>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={latitude ? 15 : 4}
                  onClick={handleMapClick}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                  }}
                >
                  {latitude !== null && longitude !== null && (
                    <Marker position={{ lat: latitude, lng: longitude }} />
                  )}
                </GoogleMap>
              )}
            </div>
          </div>

          {/* Schedule */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Schedule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
              Payment Method
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <div className="w-full px-4 py-2 bg-gray-50 border rounded-md text-gray-700 font-medium h-10 flex items-center">
                  Cash on Delivery
                </div>
                <p className="text-xs text-gray-500 mt-1 italic">Supplier-created orders are cash only.</p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          {serviceCategory !== 'service' && breakdown && (
            <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100 mb-6">
              <h3 className="text-sm font-bold text-green-800 uppercase mb-3 border-b border-gray-200 pb-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                Price Breakdown
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Base Price ({breakdown.limitDays} Days):</span>
                  <span className="font-semibold text-gray-800">${breakdown.basePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-semibold text-gray-800">{breakdown.durationDays} Day(s)</span>
                </div>
                {breakdown.exceededDays > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Extra Days ({breakdown.exceededDays} × ${breakdown.dailyRate}):</span>
                    <span className="font-semibold">+${breakdown.additionalCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-green-200 pt-2 flex justify-between items-center">
                  <span className="font-bold text-gray-800">Estimated Total:</span>
                  <span className="text-xl font-bold text-green-600">${breakdown.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md font-bold shadow-md hover:shadow-lg transform active:scale-95 transition-all flex items-center disabled:opacity-70"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                  Creating Order...
                </>
              ) : (
                'Create and Assign Order'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
