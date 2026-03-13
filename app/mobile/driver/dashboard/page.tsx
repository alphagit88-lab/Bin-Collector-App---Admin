'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface ServiceRequest {
  id: number;
  request_id: string;
  bin_type_name: string;
  bin_size: string;
  location: string;
  status: string;
  created_at: string;
}

export default function DriverDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeJobs: 0,
    completed: 0,
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ requests: ServiceRequest[] }>('/bookings/supplier/requests');
      if (response.success && response.data) {
        const allRequests = response.data.requests;
        setRequests(allRequests.slice(0, 5)); // Recent 5
        setStats({
          activeJobs: allRequests.filter(r => ['confirmed', 'on_delivery', 'delivered', 'ready_to_pickup', 'pickup'].includes(r.status)).length,
          completed: allRequests.filter(r => r.status === 'completed').length,
        });
      }
    } catch (error) {
      showToast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            Driver Dashboard
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>Welcome back, {user?.name}!</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981', marginBottom: '4px' }}>{stats.activeJobs}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Active Jobs</div>
          </div>
          <div style={{ background: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3B82F6', marginBottom: '4px' }}>{stats.completed}</div>
            <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>Completed</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: '24px' }}>
          <Link href="/mobile/driver/jobs" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'white',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '1.5rem' }}>📋</div>
                <div style={{ fontWeight: 600, color: '#111827' }}>View My Jobs</div>
              </div>
              <div style={{ color: '#9CA3AF' }}>→</div>
            </div>
          </Link>
        </div>

        {/* Recent Active Jobs */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>Recent Jobs</h2>
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6B7280' }}>
              No jobs assigned yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {requests.map((request) => (
                <Link key={request.id} href="/mobile/driver/jobs" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    padding: '12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>{request.bin_type_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>📍 {request.location}</div>
                    <div style={{ 
                        display: 'inline-block', 
                        marginTop: '8px', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.65rem', 
                        backgroundColor: '#EBF5FF', 
                        color: '#3B82F6',
                        textTransform: 'uppercase',
                        fontWeight: 700
                    }}>
                        {request.status.replace('_', ' ')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
