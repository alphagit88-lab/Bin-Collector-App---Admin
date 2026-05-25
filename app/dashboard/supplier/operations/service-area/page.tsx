'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import Link from 'next/link';
import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';

interface ServiceZoneData {
  id: string;
  country: string;
  city: string;
  areaRadiusKm: number;
  latitude: number | null;
  longitude: number | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem'
};

const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832
};

export default function ServiceAreaPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [serviceZones, setServiceZones] = useState<ServiceZoneData[]>([]);
  const [addingZone, setAddingZone] = useState(false);

  // Form State
  const [newCity, setNewCity] = useState('');
  const [newRadius, setNewRadius] = useState('');
  const [newLatitude, setNewLatitude] = useState<number | null>(null);
  const [newLongitude, setNewLongitude] = useState<number | null>(null);
  const [newCountry, setNewCountry] = useState('Australia');
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || ''
  });

  useEffect(() => {
    fetchServiceAreas();
  }, []);

  const fetchServiceAreas = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ serviceAreas: any[] }>('/supplier/service-areas');
      if (response.success && response.data?.serviceAreas) {
        const mappedZones = response.data.serviceAreas.map((area: any) => ({
          id: area.id.toString(),
          country: area.country,
          city: area.city,
          areaRadiusKm: parseFloat(area.area_radius_km),
          latitude: area.latitude ? parseFloat(area.latitude) : null,
          longitude: area.longitude ? parseFloat(area.longitude) : null,
        }));
        setServiceZones(mappedZones);
      }
    } catch (error) {
      showToast('Failed to load service areas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchAddress = async () => {
    if (!newCity) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(newCity)}&format=json&limit=1&addressdetails=1&countrycodes=ca`,
        { headers: { 'User-Agent': 'BinDropAppWeb/1.0' } }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name, address = {} } = data[0];
        const newLat = parseFloat(lat);
        const newLon = parseFloat(lon);
        setNewLatitude(newLat);
        setNewLongitude(newLon);
        setMapCenter({ lat: newLat, lng: newLon });

        const detectedCountry = address.country || '';
        const detectedCity = address.city || address.town || address.village || address.suburb || address.state || display_name;

        if (detectedCountry) setNewCountry(detectedCountry);
        setNewCity(detectedCity);
      } else {
        showToast('Location not found. Please try another search.', 'error');
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('Failed to search location.', 'error');
    }
  };

  const onMarkerDragEnd = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setNewLatitude(lat);
    setNewLongitude(lng);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'BinDropAppWeb/1.0' } }
      );
      const data = await response.json();
      if (data && data.display_name) {
        const { address = {}, display_name } = data;
        const detectedCountry = address.country || '';
        const detectedCity = address.city || address.town || address.village || address.suburb || address.state || display_name;

        if (detectedCountry) setNewCountry(detectedCountry);
        setNewCity(detectedCity);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }
  };

  const submitNewServiceArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCity.trim() || !newRadius.trim()) {
      showToast('Please enter a city and radius.', 'error');
      return;
    }

    setAddingZone(true);
    try {
      const response = await api.post('/supplier/service-areas', {
        country: newCountry || 'Australia',
        city: newCity,
        areaRadiusKm: parseFloat(newRadius),
        latitude: newLatitude,
        longitude: newLongitude,
      });

      if (response.success) {
        setNewCity('');
        setNewRadius('');
        setNewLatitude(null);
        setNewLongitude(null);
        fetchServiceAreas();
        showToast('Service area added successfully.', 'success');
      } else {
        showToast(response.message || 'Failed to add service area.', 'error');
      }
    } catch (error) {
      showToast('An error occurred while adding service area.', 'error');
    } finally {
      setAddingZone(false);
    }
  };

  const handleRemoveZone = async (id: string) => {
    if (!confirm('Are you sure you want to remove this service area?')) return;
    try {
      const response = await api.delete(`/supplier/service-areas/${id}`);
      if (response.success) {
        setServiceZones(serviceZones.filter(zone => zone.id !== id));
        showToast('Service area removed successfully.', 'success');
      } else {
        showToast(response.message || 'Failed to remove service area.', 'error');
      }
    } catch (error) {
      showToast('An error occurred while removing service area.', 'error');
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
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Service Areas</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Manage the regions and areas you service</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Add New Area Form */}
          <div className="col-span-1">
            <div className="dashboard-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Add New Area</h2>
              <form onSubmit={submitNewServiceArea}>
                <div className="form-group mb-4">
                  <label className="form-label block mb-1">City or Suburb</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="form-control w-full px-4 py-2 border rounded-md"
                      placeholder="e.g. Sydney"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSearchAddress}
                      className="bg-gray-100 hover:bg-gray-200 px-4 rounded-md border"
                    >
                      Search
                    </button>
                  </div>
                </div>

                <div className="form-group mb-6">
                  <label className="form-label block mb-1">Radius (KM)</label>
                  <input
                    type="number"
                    value={newRadius}
                    onChange={(e) => setNewRadius(e.target.value)}
                    className="form-control w-full px-4 py-2 border rounded-md"
                    placeholder="e.g. 50"
                    required
                    min="1"
                  />
                </div>

                <div className="mb-6 h-64 bg-gray-100 rounded-md overflow-hidden relative">
                  {!isLoaded ? (
                    <div className="flex items-center justify-center h-full text-gray-500">Loading Map...</div>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={mapCenter}
                      zoom={newLatitude ? 10 : 4}
                      options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                      }}
                    >
                      {newLatitude && newLongitude && (
                        <>
                          <Marker
                            position={{ lat: newLatitude, lng: newLongitude }}
                            draggable={true}
                            onDragEnd={onMarkerDragEnd}
                          />
                          <Circle
                            center={{ lat: newLatitude, lng: newLongitude }}
                            radius={(parseFloat(newRadius) || 0) * 1000}
                            options={{
                              fillColor: "rgba(119, 196, 10, 0.2)",
                              strokeColor: "#37B112",
                              strokeOpacity: 0.8,
                              strokeWeight: 2,
                            }}
                          />
                        </>
                      )}
                    </GoogleMap>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={addingZone}
                  className="btn btn-primary w-full py-2 rounded-md font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}
                >
                  {addingZone ? 'Adding...' : 'Add Service Area'}
                </button>
              </form>
            </div>
          </div>

          {/* List of Service Areas */}
          <div className="col-span-1">
            <div className="dashboard-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>Configured Service Zones</h2>

              {serviceZones.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No service areas configured. Add your first area to get started.
                </div>
              ) : (
                <div className="flex flex-col gap-4 max-h-[800px] overflow-y-auto pr-2">
                  {serviceZones.map(zone => (
                    <div key={zone.id} className="border rounded-lg p-4 bg-gray-50/50">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-lg">{zone.city}</h3>
                          <p className="text-sm text-gray-500">{zone.country}</p>
                        </div>
                        <div className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                          {zone.areaRadiusKm} km
                        </div>
                      </div>

                      {isLoaded && zone.latitude && zone.longitude && (
                        <div className="h-32 mb-4 rounded-md overflow-hidden pointer-events-none">
                          <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={{ lat: zone.latitude, lng: zone.longitude }}
                            zoom={9}
                            options={{
                              disableDefaultUI: true,
                              draggable: false,
                              scrollwheel: false,
                              disableDoubleClickZoom: true,
                            }}
                          >
                            <Marker position={{ lat: zone.latitude, lng: zone.longitude }} />
                            <Circle
                              center={{ lat: zone.latitude, lng: zone.longitude }}
                              radius={zone.areaRadiusKm * 1000}
                              options={{
                                fillColor: "rgba(119, 196, 10, 0.2)",
                                strokeColor: "#37B112",
                                strokeOpacity: 0.8,
                                strokeWeight: 2,
                              }}
                            />
                          </GoogleMap>
                        </div>
                      )}

                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/dashboard/supplier/bin-pricing?serviceAreaId=${zone.id}&city=${encodeURIComponent(zone.city)}`}
                          className="text-center w-full bg-white border border-green-500 text-green-600 font-medium py-1.5 px-4 rounded hover:bg-green-50 transition-colors"
                        >
                          Setup Bin Pricing
                        </Link>
                        <button
                          onClick={() => handleRemoveZone(zone.id)}
                          className="text-center w-full bg-white border border-red-200 text-red-500 font-medium py-1.5 px-4 rounded hover:bg-red-50 transition-colors text-sm"
                        >
                          Remove Area
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
