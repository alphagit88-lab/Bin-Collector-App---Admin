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

const GOOGLE_LIBRARIES: any[] = ["places"];

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
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<string[]>([]);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files);
      setAttachments(prev => [...prev, ...fileList]);
      
      fileList.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachmentPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setAttachmentPreviews(prev => prev.filter((_, i) => i !== index));
  };

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
  const [supplierServiceAreas, setSupplierServiceAreas] = useState<any[]>([]);
  const [systemSettings, setSystemSettings] = useState<Record<string, string>>({});
  const [fetchingSettings, setFetchingSettings] = useState(true);
  const [calculatedPrice, setCalculatedPrice] = useState<any>(null);
  const [fetchingCalculatedPrice, setFetchingCalculatedPrice] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || '',
    libraries: GOOGLE_LIBRARIES
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [categoriesRes, settingsRes, serviceAreasRes] = await Promise.all([
        api.get<{ categories: ServiceCategory[] }>('/service-categories'),
        api.get<{ settings: any[] }>('/settings'),
        api.get<{ serviceAreas: any[] }>('/supplier/service-areas')
      ]);

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
      if (serviceAreasRes.success && serviceAreasRes.data) {
        setSupplierServiceAreas(serviceAreasRes.data.serviceAreas);
      }
    } catch (error) {
      showToast('Failed to load initial data', 'error');
    } finally {
      setFetchingData(false);
      setFetchingSettings(false);
    }
  };

  const fetchLocationBins = async (lat: number, lon: number) => {
    try {
      const [typesRes, sizesRes] = await Promise.all([
        api.get<{ binTypes: BinType[] }>(`/bins/supplier/types?lat=${lat}&lon=${lon}`),
        api.get<{ binSizes: BinSize[] }>(`/bins/supplier/sizes?lat=${lat}&lon=${lon}`)
      ]);
      if (typesRes.success && typesRes.data) {
        setBinTypes(typesRes.data.binTypes);
      }
      if (sizesRes.success && sizesRes.data) {
        setBinSizes(sizesRes.data.binSizes);
      }
    } catch (error) {
      console.error('Error fetching location bins:', error);
    }
  };

  useEffect(() => {
    if (latitude && longitude) {
      fetchBinPrices(latitude, longitude);
      fetchLocationBins(latitude, longitude);
    } else {
      setBinTypes([]);
      setBinSizes([]);
      setBinPrices([]);
      setSelectedBins([{ bin_type_id: 0, bin_size_id: null, quantity: 1, price: '' }]);
    }
  }, [latitude, longitude]);

  const fetchLocationSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (typeof window === 'undefined' || !(window as any).google || !(window as any).google.maps || !(window as any).google.maps.places) {
      return;
    }
    try {
      const service = new (window as any).google.maps.places.AutocompleteService();
      service.getPlacePredictions({ input: query, componentRestrictions: { country: 'CA' } }, (predictions: any, status: any) => {
        if (status === 'OK' && predictions) {
          const formatted = predictions.map((p: any) => ({
            display_name: p.description,
            place_id: p.place_id
          }));
          setLocationSuggestions(formatted);
          setShowSuggestions(true);
        } else {
          setLocationSuggestions([]);
          setShowSuggestions(false);
        }
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      setLocationSuggestions([]);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocation(value);
    
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const timer = setTimeout(() => {
      fetchLocationSuggestions(value);
    }, 500);
    
    setDebounceTimer(timer);
  };

  const selectSuggestion = async (suggestion: any) => {
    setLocation(suggestion.display_name);
    setShowSuggestions(false);
    
    if (typeof window !== 'undefined' && (window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ placeId: suggestion.place_id }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const newLat = loc.lat();
          const newLon = loc.lng();
          setLatitude(newLat);
          setLongitude(newLon);
          setMapCenter({ lat: newLat, lng: newLon });
        } else {
          console.error('Place geocoding failed with status:', status);
        }
      });
    }
  };

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setLatitude(lat);
    setLongitude(lng);

    if (typeof window !== 'undefined' && (window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          setLocation(address);
        } else {
          console.error('Reverse geocode failed with status:', status);
        }
      });
    }
  };

  const fetchBinPrices = async (lat: number, lon: number) => {
    try {
      const response = await api.get<{ prices: any[] }>(`/bins/prices?lat=${lat}&lon=${lon}`);
      if (response.success && response.data) {
        const supplierAreaIds = supplierServiceAreas.map(sa => sa.id);
        const supplierPrices = response.data.prices.filter(p => supplierAreaIds.includes(p.service_area_id));
        setBinPrices(supplierPrices);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const fetchCalculatedPrice = async () => {
    try {
      if (
        serviceCategory === 'service' ||
        !selectedBins.some(b => b.bin_size_id) ||
        !location ||
        (serviceCategory === 'residential' && (!startDate || !endDate))
      ) {
        setCalculatedPrice(null);
        return;
      }

      setFetchingCalculatedPrice(true);

      const requestBody = {
        service_category: serviceCategory,
        bins: selectedBins.filter(b => b.bin_size_id).map(b => ({
          bin_type_id: b.bin_type_id,
          bin_size_id: b.bin_size_id,
          quantity: b.quantity
        })),
        location,
        start_date: startDate,
        end_date: endDate,
        latitude,
        longitude
      };

      const response = await api.post('/bookings/calculate-price', requestBody);

      if (response.success && response.data) {
        setCalculatedPrice(response.data);
      } else {
        console.error('Calculate price failed:', response.message);
        setCalculatedPrice(null);
      }
    } catch (error) {
      console.error('Error calculating price:', error);
      setCalculatedPrice(null);
    } finally {
      setFetchingCalculatedPrice(false);
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

  useEffect(() => {
    fetchCalculatedPrice();
  }, [selectedBins, location, startDate, endDate, latitude, longitude, serviceCategory]);

  const handleSearchAddress = async () => {
    if (!location) return;
    if (typeof window !== 'undefined' && (window as any).google) {
      const geocoder = new (window as any).google.maps.Geocoder();
      geocoder.geocode({ address: location, componentRestrictions: { country: 'CA' } }, (results: any, status: any) => {
        if (status === 'OK' && results && results[0]) {
          const loc = results[0].geometry.location;
          const newLat = loc.lat();
          const newLon = loc.lng();
          setLatitude(newLat);
          setLongitude(newLon);
          setMapCenter({ lat: newLat, lng: newLon });
          setLocation(results[0].formatted_address);
        } else {
          console.error('Search address failed with status:', status);
        }
      });
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
      const formData = new FormData();
      formData.append('customer_name', customerName);
      formData.append('customer_phone', customerPhone);
      formData.append('service_category', serviceCategory);
      formData.append('location', location);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('instructions', instructions);
      formData.append('payment_method', 'cash');
      
      if (poNumber) {
        formData.append('po_number', poNumber);
      }
      if (latitude !== null) {
        formData.append('latitude', latitude.toString());
      }
      if (longitude !== null) {
        formData.append('longitude', longitude.toString());
      }

      if (serviceCategory === 'service') {
        if (selectedServices.length === 0) {
          showToast('Please select at least one service', 'error');
          setLoading(false);
          return;
        }
        formData.append('selected_services', JSON.stringify(selectedServices));
        formData.append('total_price', totalPrice || '0');
      } else {
        const validBins = selectedBins.filter(b => b.bin_type_id > 0);
        if (validBins.length === 0) {
          showToast('Please select at least one bin type', 'error');
          setLoading(false);
          return;
        }
        formData.append('bins', JSON.stringify(validBins.map(b => ({
          bin_type_id: b.bin_type_id,
          bin_size_id: b.bin_size_id,
          quantity: b.quantity,
          price: b.price || '0',
        }))));
      }

      if (attachments.length > 0) {
        attachments.forEach((file) => {
          formData.append('attachments', file);
        });
      }

      const response = await api.post('/bookings/supplier/create', formData);

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
            
            <div className="mb-2">
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
          </div>

          {/* Location & Map */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              Location Selection
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address *</label>
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={location}
                    onChange={handleAddressChange}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => location.length >= 3 && setShowSuggestions(true)}
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
                {/* Suggestions Dropdown */}
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        <div className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mt-0.5 mr-3 flex-shrink-0"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                          <span className="text-sm text-gray-700">{suggestion.display_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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

          {/* Bins & Pricing / Service Details */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            {serviceCategory !== 'service' ? (
              (!latitude || !longitude) ? (
                <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  <p className="text-sm font-semibold text-gray-500">
                    Please select or search a location first before choosing bins
                  </p>
                </div>
              ) : binTypes.filter(t => binPrices.some(p => p.bin_type_id === t.id)).length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-lg border border-gray-100 flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mb-3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <p className="text-sm font-semibold text-gray-500">
                    No bins configured or priced in your service area for this location.
                  </p>
                </div>
              ) : (
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
                          {binTypes
                            .filter(t => binPrices.some(p => p.bin_type_id === t.id))
                            .map(t => {
                              const availableSizes = binSizes.filter(s => s.bin_type_id === t.id && binPrices.some(p => p.bin_size_id === s.id));
                              let isTypeDisabled = false;
                              if (availableSizes.length > 0) {
                                isTypeDisabled = availableSizes.every(size =>
                                  selectedBins.some((b, idx) =>
                                    idx !== index &&
                                    b.bin_type_id === t.id &&
                                    b.bin_size_id === size.id
                                  )
                                );
                              } else {
                                isTypeDisabled = selectedBins.some((b, idx) =>
                                  idx !== index &&
                                  b.bin_type_id === t.id
                                );
                              }
                              return (
                                <option key={t.id} value={t.id} disabled={isTypeDisabled}>
                                  {t.name} {isTypeDisabled ? '(All Sizes Selected)' : ''}
                                </option>
                              );
                            })}
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
                            {binSizes
                              .filter(s => s.bin_type_id === bin.bin_type_id && binPrices.some(p => p.bin_size_id === s.id))
                              .map(s => {
                                const isSizeAlreadySelected = selectedBins.some((b, idx) =>
                                  idx !== index &&
                                  b.bin_type_id === bin.bin_type_id &&
                                  b.bin_size_id === s.id
                                );
                                return (
                                  <option key={s.id} value={s.id} disabled={isSizeAlreadySelected}>
                                    {s.size} {isSizeAlreadySelected ? '(Already Selected)' : ''}
                                  </option>
                                );
                              })}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
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
              )
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

          {/* Additional Details */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              Additional Information (Optional)
            </h2>
            <div className="space-y-4">
              {serviceCategory !== 'service' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Enter PO Number"
                  />
                </div>
              )}
              
              {serviceCategory !== 'service' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instructions / Notes</label>
                  <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Add special delivery/pickup instructions..."
                    rows={3}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Upload Attachments</label>
                <div className="mt-2 flex flex-wrap gap-3 items-center">
                  {attachmentPreviews.map((preview, index) => (
                    <div key={index} className="relative w-20 h-20 border rounded-lg overflow-hidden group">
                      <img src={preview} alt="preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  {attachments.length < 10 && (
                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 transition-colors">
                      <span className="text-xl text-gray-400 font-bold">+</span>
                      <span className="text-[10px] text-gray-400 font-semibold">Upload</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Upload up to 10 photos of the site/setup.</p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          {serviceCategory !== 'service' && calculatedPrice && (
            <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100 mb-6">
              <h3 className="text-sm font-bold text-green-800 uppercase mb-3 border-b border-gray-200 pb-1 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                Price Breakdown
              </h3>
              {fetchingCalculatedPrice ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-800">${calculatedPrice.subtotal.toFixed(2)}</span>
                  </div>
                  {calculatedPrice.duration_days && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold text-gray-800">{calculatedPrice.duration_days} Day(s)</span>
                    </div>
                  )}
                  {calculatedPrice.additional_duration_charge > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Extra Days ({calculatedPrice.exceeded_days} day(s)):</span>
                      <span className="font-semibold">+${calculatedPrice.additional_duration_charge.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">GST ({calculatedPrice.gst_rate}%):</span>
                    <span className="font-semibold text-gray-800">${calculatedPrice.gst_amount.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-green-200 pt-2 flex justify-between items-center">
                    <span className="font-bold text-gray-800">Estimated Total:</span>
                    <span className="text-xl font-bold text-green-600">${calculatedPrice.total.toFixed(2)}</span>
                  </div>
                </div>
              )}
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
