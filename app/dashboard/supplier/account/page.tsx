'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api, API_BASE_URL } from '@/lib/api';
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

export default function AccountSettingsPage() {
  const { user, refreshUser, logout } = useAuth();
  const { showToast } = useToast();
  
  // Profile Forms
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  
  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Location
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY || ''
  });

  useEffect(() => {
    // Load default location from localStorage like the mobile app
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
        } else {
          console.error('Reverse geocode failed with status:', status);
        }
      });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    try {
      const response = await api.put('/auth/profile', { name, email, phone });
      if (response.success) {
        showToast('Profile updated successfully', 'success');
        refreshUser();
      } else {
        showToast(response.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    setLoadingPassword(true);
    try {
      const response = await api.put('/auth/password', { currentPassword, newPassword });
      if (response.success) {
        showToast('Password changed successfully', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(response.message || 'Failed to change password', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoadingPassword(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePhoto', file);

    setLoadingPhoto(true);
    try {
      const response = await api.put('/auth/profile/photo', formData);
      if (response.success) {
        showToast('Profile photo updated successfully', 'success');
        refreshUser();
      } else {
        showToast(response.message || 'Failed to update photo', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteRequest = async () => {
    if (!confirm('Are you sure you want to request profile deletion? This action cannot be undone.')) {
      return;
    }
    
    setLoadingDelete(true);
    try {
      const response = await api.post('/auth/request-delete');
      if (response.success) {
        showToast('Profile deletion requested. You will be logged out.', 'success');
        setTimeout(() => logout(), 2000);
      } else {
        showToast(response.message || 'Failed to request deletion', 'error');
      }
    } catch (error) {
      showToast('An unexpected error occurred', 'error');
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Account Settings</h1>
          <p className="text-gray-600">Manage your profile, security, and preferences</p>
        </div>

        {/* Profile Header */}
        <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100 flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-md flex items-center justify-center">
              {loadingPhoto ? (
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
              ) : user?.profilePhoto ? (
                <img
                  src={user.profilePhoto.startsWith('http') ? user.profilePhoto : `${API_BASE_URL}${user.profilePhoto.startsWith('/') ? '' : '/'}${user.profilePhoto}`}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-gray-400">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full shadow-lg hover:bg-green-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
            <p className="text-gray-500 capitalize">{user?.role} Account</p>
            <p className="text-sm text-gray-400 mt-1">BIN_User{user?.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Profile Details */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              Profile Details
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-400 mt-1">Phone number cannot be changed.</p>
              </div>
              <button
                type="submit"
                disabled={loadingProfile}
                className="w-full py-2 bg-green-50 text-green-700 font-semibold rounded-md hover:bg-green-100 transition-colors flex items-center justify-center border border-green-200"
              >
                {loadingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Security */}
          <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              Security
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-green-500 outline-none"
                  required
                  minLength={6}
                />
              </div>
              <button
                type="submit"
                disabled={loadingPassword}
                className="w-full py-2 bg-green-50 text-green-700 font-semibold rounded-md hover:bg-green-100 transition-colors flex items-center justify-center border border-green-200"
              >
                {loadingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Default Location */}
        <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 flex items-center border-b pb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-green-600"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            Default Operational Location
          </h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              This location is used as your default starting point for operations and maps. Click on the map to set a new location.
            </p>
            <div className="flex items-center bg-gray-50 p-3 rounded-md border border-gray-200">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mr-2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              <span className="text-sm font-medium text-gray-700">{location || 'No location set'}</span>
            </div>
          </div>
          <div className="h-[300px] bg-gray-100 rounded-md overflow-hidden relative">
            {!isLoaded ? (
              <div className="flex items-center justify-center h-full text-gray-500">Loading Map...</div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={latitude ? 14 : 4}
                onClick={handleMapClick}
                options={{ streetViewControl: false, mapTypeControl: false }}
              >
                {latitude !== null && longitude !== null && (
                  <Marker position={{ lat: latitude, lng: longitude }} />
                )}
              </GoogleMap>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        <div className="dashboard-card rounded-lg p-6 bg-white shadow-sm border border-red-100">
          <h2 className="text-lg font-semibold mb-4 text-red-700 flex items-center border-b border-red-100 pb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            Danger Zone
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-800">Delete Account</h3>
              <p className="text-sm text-gray-500 max-w-lg mt-1">
                Once you delete your account, there is no going back. Please be certain. This sends a request to administrators to purge your data.
              </p>
            </div>
            <button
              onClick={handleDeleteRequest}
              disabled={loadingDelete}
              className="mt-4 sm:mt-0 px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-md font-medium text-sm transition-colors"
            >
              {loadingDelete ? 'Requesting...' : 'Request Deletion'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
