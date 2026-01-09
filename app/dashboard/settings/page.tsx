'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface SystemSetting {
  id: number;
  key: string;
  value: string;
  type: string;
  description?: string;
  category: string;
  is_public: boolean;
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const response = await api.get<{ settings: SystemSetting[] }>('/settings');
    if (response.success && response.data) {
      setSettings(response.data.settings);
    } else {
      showToast('Failed to fetch settings', 'error');
    }
    setLoading(false);
  };

  const handleEdit = (setting: SystemSetting) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const handleSave = async (key: string) => {
    const setting = settings.find(s => s.key === key);
    if (!setting) return;

    const response = await api.put(`/settings/${key}`, { value: editValue });
    if (response.success) {
      showToast('Setting updated successfully', 'success');
      setEditingKey(null);
      fetchSettings();
    } else {
      showToast(response.message || 'Failed to update setting', 'error');
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

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
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>System Settings</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>Manage system configuration parameters</p>
        </div>

        {Object.entries(groupedSettings).map(([category, categorySettings]) => (
          <div key={category} className="dashboard-card rounded-lg p-6 mb-6">
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
              {category}
            </h2>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySettings.map((setting) => (
                    <tr key={setting.key}>
                      <td style={{ fontWeight: 500 }}>{setting.key}</td>
                      <td>
                        {editingKey === setting.key ? (
                          <input
                            type={setting.type === 'number' ? 'number' : setting.type === 'boolean' ? 'checkbox' : 'text'}
                            className="form-control"
                            value={setting.type === 'boolean' ? undefined : editValue}
                            checked={setting.type === 'boolean' ? editValue === 'true' : undefined}
                            onChange={(e) => {
                              if (setting.type === 'boolean') {
                                setEditValue(e.target.checked ? 'true' : 'false');
                              } else {
                                setEditValue(e.target.value);
                              }
                            }}
                            style={{ width: '100%', maxWidth: '300px' }}
                          />
                        ) : (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                            {setting.type === 'json' ? JSON.stringify(JSON.parse(setting.value), null, 2) : setting.value}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-customer">{setting.type}</span>
                      </td>
                      <td>{setting.description || '-'}</td>
                      <td>
                        {editingKey === setting.key ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              className="btn btn-primary btn-sm cursor-pointer"
                              onClick={() => handleSave(setting.key)}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-outline btn-sm cursor-pointer"
                              onClick={handleCancel}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn btn-outline btn-sm cursor-pointer"
                            onClick={() => handleEdit(setting)}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
