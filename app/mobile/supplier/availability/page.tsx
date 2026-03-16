'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Bin {
  id: number;
  bin_code: string;
  bin_type_name: string;
  bin_size: string;
  status: string;
}

export default function AvailabilityPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [operatingHours, setOperatingHours] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '17:00' },
    sunday: { enabled: false, start: '09:00', end: '17:00' },
  });

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    fetchBins();
  }, [user, router]);

  const fetchBins = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ bins: Bin[] }>('/bins/physical');
      if (response.success && response.data) {
        setBins(response.data.bins);
      }
    } catch (error) {
      showToast('Failed to load bins', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    try {
      const availableBins = bins.filter(b => b.status === 'available' || b.status === 'unavailable');
      const promises = availableBins.map(bin =>
        api.put(`/bins/physical/${bin.id}`, { status })
      );
      await Promise.all(promises);
      showToast(`All bins marked as ${status}`, 'success');
      fetchBins();
    } catch (error) {
      showToast('Failed to update bin statuses', 'error');
    }
  };

  const handleUpdateStatus = async (binId: number, newStatus: string) => {
    try {
      const response = await api.put(`/bins/physical/${binId}`, { status: newStatus });
      if (response.success) {
        showToast('Bin status updated', 'success');
        fetchBins();
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10B981';
      case 'unavailable': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  const availableBins = bins.filter(b => b.status === 'available' || b.status === 'unavailable');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
          Availability Management
        </h1>

        {/* Operating Hours */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Operating Hours</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(operatingHours).map(([day, hours]) => (
              <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={hours.enabled}
                  onChange={(e) => setOperatingHours({
                    ...operatingHours,
                    [day]: { ...hours, enabled: e.target.checked }
                  })}
                  style={{ cursor: 'pointer' }}
                />
                <div style={{ minWidth: '100px', fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>
                  {day}
                </div>
                {hours.enabled && (
                  <>
                    <input
                      type="time"
                      value={hours.start}
                      onChange={(e) => setOperatingHours({
                        ...operatingHours,
                        [day]: { ...hours, start: e.target.value }
                      })}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        fontSize: '0.875rem'
                      }}
                    />
                    <span style={{ color: '#6B7280' }}>to</span>
                    <input
                      type="time"
                      value={hours.end}
                      onChange={(e) => setOperatingHours({
                        ...operatingHours,
                        [day]: { ...hours, end: e.target.value }
                      })}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        border: '1px solid #E5E7EB',
                        fontSize: '0.875rem'
                      }}
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: '16px', padding: '12px', background: '#F3F4F6', borderRadius: '8px', fontSize: '0.75rem', color: '#6B7280' }}>
            Note: Operating hours are saved locally for demo. Backend integration coming soon.
          </div>
        </div>

        {/* Fleet Availability */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Fleet Availability</h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleBulkStatusUpdate('available')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Mark All Available
              </button>
              <button
                onClick={() => handleBulkStatusUpdate('unavailable')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Mark All Unavailable
              </button>
            </div>
          </div>

          <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '16px' }}>
            {availableBins.length} bins available for status update
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {availableBins.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🚛</div>
                <div>No bins available for status update</div>
              </div>
            ) : (
              availableBins.map((bin) => (
                <div
                  key={bin.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '4px' }}>
                      {bin.bin_code}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      {bin.bin_type_name} - {bin.bin_size}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      backgroundColor: getStatusColor(bin.status) + '20',
                      color: getStatusColor(bin.status)
                    }}>
                      {formatStatus(bin.status)}
                    </div>
                    <button
                      onClick={() => handleUpdateStatus(bin.id, bin.status === 'available' ? 'unavailable' : 'available')}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: bin.status === 'available' ? '#EF4444' : '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      {bin.status === 'available' ? 'Unavailable' : 'Available'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
