'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Driver {
    id: number;
    name: string;
    phone: string;
    email?: string;
    created_at: string;
}

export default function SupplierDriversPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { showToast } = useToast();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
    });

    useEffect(() => {
        if (user?.role !== 'supplier') {
            router.push('/dashboard');
            return;
        }
        fetchDrivers();
    }, [user, router]);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const response = await api.get<{ drivers: Driver[] }>('/suppliers/drivers');
            if (response.success && response.data) {
                setDrivers(response.data.drivers);
            }
        } catch (error) {
            showToast('Failed to load drivers', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleAddDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/suppliers/drivers', formData);
            if (response.success) {
                showToast('Driver added successfully', 'success');
                setShowModal(false);
                setFormData({ name: '', phone: '', email: '', password: '' });
                fetchDrivers();
            } else {
                showToast(response.message || 'Failed to add driver', 'error');
            }
        } catch (error: any) {
            showToast(error.message || 'Failed to add driver', 'error');
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
        <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', paddingBottom: '80px' }}>
            <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#111827' }}>
                        My Drivers
                    </h1>
                    <button 
                        onClick={() => setShowModal(true)}
                        style={{
                            backgroundColor: '#10B981',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        + Add New
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {drivers.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: '12px', color: '#6B7280' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🚛</div>
                            <div>No drivers added yet</div>
                        </div>
                    ) : (
                        drivers.map((driver) => (
                            <div key={driver.id} style={{
                                background: 'white',
                                padding: '16px',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                                        {driver.name}
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                        📞 {driver.phone}
                                    </div>
                                    {driver.email && (
                                        <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                            ✉️ {driver.email}
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                    Joined {new Date(driver.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {showModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }} onClick={() => setShowModal(false)}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '400px'
                        }} onClick={(e) => e.stopPropagation()}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px' }}>Add Driver</h2>
                            <form onSubmit={handleAddDriver}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px' }}>Full Name *</label>
                                    <input 
                                        type="text"
                                        required
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px' }}>Phone Number *</label>
                                    <input 
                                        type="text"
                                        required
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px' }}>Email (Optional)</label>
                                    <input 
                                        type="email"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px' }}>Password *</label>
                                    <input 
                                        type="password"
                                        required
                                        minLength={6}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button 
                                        type="submit"
                                        style={{ flex: 1, backgroundColor: '#10B981', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Create Account
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#374151', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
            <Link 
                href="/mobile/supplier/dashboard"
                style={{
                    position: 'fixed',
                    top: '20px',
                    left: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    textDecoration: 'none',
                    fontSize: '1.25rem',
                    zIndex: 10
                }}
            >
                ←
            </Link>
        </div>
    );
}
