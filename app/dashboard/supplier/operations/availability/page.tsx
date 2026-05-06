'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface DaySchedule {
  day: string;
  isClosed: boolean;
  startTime: string;
  endTime: string;
}

const DEFAULT_SCHEDULE: DaySchedule[] = [
  { day: 'Monday', isClosed: false, startTime: '07:00 AM', endTime: '05:00 PM' },
  { day: 'Tuesday', isClosed: false, startTime: '07:00 AM', endTime: '05:00 PM' },
  { day: 'Wednesday', isClosed: false, startTime: '07:00 AM', endTime: '05:00 PM' },
  { day: 'Thursday', isClosed: false, startTime: '07:00 AM', endTime: '05:00 PM' },
  { day: 'Friday', isClosed: false, startTime: '07:00 AM', endTime: '05:00 PM' },
  { day: 'Saturday', isClosed: false, startTime: '07:00 AM', endTime: '03:00 PM' },
  { day: 'Sunday', isClosed: true, startTime: '09:00 AM', endTime: '05:00 PM' },
];

export default function AvailabilityPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);

  useEffect(() => {
    fetchAvailability();
  }, []);

  const fetchAvailability = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ availability: DaySchedule[] }>('/supplier/availability');
      if (response.success && response.data?.availability && response.data.availability.length > 0) {
        const fetchedSchedule = response.data.availability;
        const mergedSchedule = DEFAULT_SCHEDULE.map(defaultDay => {
          const found = fetchedSchedule.find(f => f.day === defaultDay.day);
          return found ? { ...found } : { ...defaultDay };
        });
        setSchedule(mergedSchedule);
      }
    } catch (error) {
      showToast('Failed to load availability settings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await api.post('/supplier/availability', { schedule });
      if (response.success) {
        showToast('Availability updated successfully.', 'success');
      } else {
        showToast(response.message || 'Failed to update availability.', 'error');
      }
    } catch (error) {
      showToast('An error occurred while saving.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleClosed = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].isClosed = !newSchedule[index].isClosed;
    setSchedule(newSchedule);
  };

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
          <p className="font-light" style={{ color: 'var(--color-text-secondary)' }}>Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-7xl mx-auto">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Availability</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Manage your operating hours and available dates</p>
        </div>

        <div className="dashboard-card rounded-lg p-8 max-w-4xl mx-auto">
          <div className="mb-6 border-b pb-4">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Set Operating Hours</h2>
            <p className="text-sm text-gray-500 mt-1">Check the box to mark a day as Open. Uncheck to mark as Closed.</p>
          </div>

          <div className="space-y-4">
            {schedule.map((item, index) => (
              <div key={item.day} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-green-200 transition-colors">
                <div className="flex items-center w-1/3">
                  <input
                    type="checkbox"
                    id={`day-${item.day}`}
                    checked={!item.isClosed}
                    onChange={() => toggleClosed(index)}
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                  />
                  <label htmlFor={`day-${item.day}`} className="ml-3 font-semibold text-gray-700 cursor-pointer">
                    {item.day}
                  </label>
                </div>

                <div className="flex items-center space-x-4 w-2/3 justify-end">
                  {item.isClosed ? (
                    <div className="px-4 py-2 bg-gray-200 text-gray-500 rounded font-medium w-full text-center max-w-[280px]">
                      Closed
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={convert12to24(item.startTime)}
                        onChange={(e) => handleTimeChange(index, 'startTime', convert24to12(e.target.value))}
                        className="border border-gray-300 rounded px-3 py-2 outline-none focus:border-green-500"
                      />
                      <span className="text-gray-400 font-medium">to</span>
                      <input
                        type="time"
                        value={convert12to24(item.endTime)}
                        onChange={(e) => handleTimeChange(index, 'endTime', convert24to12(e.target.value))}
                        className="border border-gray-300 rounded px-3 py-2 outline-none focus:border-green-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary px-8 py-3 rounded-md font-semibold text-white flex items-center"
              style={{ background: 'linear-gradient(135deg, #29B554 0%, #6EAD16 100%)' }}
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white rounded-full border-t-transparent animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility functions for time conversion between native input and DB format
function convert12to24(time12h: string): string {
  if (!time12h) return '00:00';
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = '00';
  }
  if (modifier === 'PM') {
    hours = (parseInt(hours, 10) + 12).toString();
  }
  
  return `${hours.padStart(2, '0')}:${minutes}`;
}

function convert24to12(time24h: string): string {
  if (!time24h) return '12:00 AM';
  let [hours, minutes] = time24h.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 || 12;
  
  return `${displayHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}
