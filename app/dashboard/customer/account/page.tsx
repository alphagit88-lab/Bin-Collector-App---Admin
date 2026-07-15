'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, API_BASE_URL } from '@/lib/api';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.75rem'
};

const defaultCenter = {
  lat: 43.6532,
  lng: -79.3832
};

const GOOGLE_LIBRARIES: any[] = ["places"];

export default function CustomerAccountPage() {
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  
  // Profile Form
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  
  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Default Location
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || '',
    libraries: GOOGLE_LIBRARIES
  });

  useEffect(() => {
    const rawLoc = localStorage.getItem('defaultLocation');
    if (rawLoc) {
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
    
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setLatitude(lat);
    setLongitude(lng);

    if (typeof window !== 'undefined' && window.google) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const address = results[0].formatted_address;
          setLocation(address);
          localStorage.setItem('defaultLocation', JSON.stringify({
            address,
            lat,
            lng
          }));
          showToast('Default location updated', 'success');
        }
      });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      const response = await api.put('/auth/profile', { name, phone });
      if (response.success) {
        showToast('Profile updated successfully', 'success');
        refreshUser();
      } else {
        showToast(response.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setLoadingPassword(true);
    try {
      const response = await api.put('/auth/password', {
        currentPassword,
        newPassword
      });
      if (response.success) {
        showToast('Password updated successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(response.message || 'Failed to update password', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setLoadingPassword(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('profilePhoto', file);
      const response = await api.put('/auth/profile/photo', formData);
      if (response.success) {
        showToast('Profile photo updated', 'success');
        refreshUser();
      } else {
        showToast(response.message || 'Failed to update photo', 'error');
      }
    } catch (error) {
      showToast('An error occurred', 'error');
    } finally {
      setLoadingPhoto(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Account Settings</h1>
          <p className="text-gray-500 mt-1">Manage your profile, password, and preferences</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Personal Information</h2>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Photo */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg">
                    {user?.profilePhoto ? (
                      <img 
                        src={user.profilePhoto.startsWith('http') ? user.profilePhoto : `${API_BASE_URL}${user.profilePhoto.startsWith('/') ? '' : '/'}${user.profilePhoto}`} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-gray-400">{user ? getInitials(user.name) : 'U'}</span>
                    )}
                    {loadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-white rounded-full animate-spin border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loadingPhoto}
                    className="absolute bottom-0 right-0 p-2.5 bg-gray-900 text-white rounded-full shadow-lg hover:bg-gray-700 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleProfileUpdate} className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input 
                      type="text" value={name} onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input 
                      type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input 
                      type="email" value={email} disabled
                      className="w-full px-4 py-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">To change your email address, please contact support.</p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button 
                    type="submit" disabled={loadingProfile || (name === user?.name && phone === user?.phone)}
                    className="px-6 py-2.5 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}
                  >
                    {loadingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Default Location</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500 mb-4">Set your default address for faster bin ordering. Click on the map to place a pin.</p>
            {location && (
              <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {location}
              </div>
            )}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              {!isLoaded ? (
                <div className="h-[300px] flex items-center justify-center bg-gray-50 text-gray-400">Loading Map...</div>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={mapCenter}
                  zoom={latitude && longitude ? 14 : 10}
                  onClick={handleMapClick}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: false,
                  }}
                >
                  {latitude && longitude && (
                    <Marker position={{ lat: latitude, lng: longitude }} />
                  )}
                </GoogleMap>
              )}
            </div>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Security</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input 
                  type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input 
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input 
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={6}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500" required
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit" disabled={loadingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loadingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
