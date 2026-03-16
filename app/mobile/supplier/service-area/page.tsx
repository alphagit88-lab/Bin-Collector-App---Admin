'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

export default function ServiceAreaPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState('');

  useEffect(() => {
    if (user?.role !== 'supplier') {
      router.push('/dashboard');
      return;
    }
    // TODO: Fetch service areas from backend when implemented
  }, [user, router]);

  const handleAddArea = () => {
    if (newArea.trim()) {
      setServiceAreas([...serviceAreas, newArea.trim()]);
      setNewArea('');
      showToast('Service area added (demo only)', 'success');
    }
  };

  const handleRemoveArea = (index: number) => {
    setServiceAreas(serviceAreas.filter((_, i) => i !== index));
    showToast('Service area removed (demo only)', 'success');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
      <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          Service Area
        </h1>
        <p style={{ color: '#6B7280', fontSize: '0.95rem', marginBottom: '24px' }}>
          Define your geographical service areas. Map integration coming soon.
        </p>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '8px' }}>
              Add Service Area (Zip Code / Suburb)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="e.g., 12345 or Downtown Area"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  fontSize: '0.875rem'
                }}
              />
              <button
                onClick={handleAddArea}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '16px' }}>Current Service Areas</h2>
          {serviceAreas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6B7280' }}>
              <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📍</div>
              <div>No service areas defined</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {serviceAreas.map((area, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{area}</div>
                  <button
                    onClick={() => handleRemoveArea(index)}
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
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#FEF3C7',
          borderRadius: '12px',
          border: '1px solid #FCD34D'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#92400E' }}>
            <strong>Note:</strong> Map integration with Google Maps/Apple Maps will be implemented in the future. For now, you can manually add service areas by zip code or suburb name.
          </div>
        </div>
      </div>
    </div>
  );
}
