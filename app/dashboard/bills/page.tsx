'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Bill {
    id: number;
    bill_id: string;
    service_request_id: number;
    service_request_code: string;
    customer_id: number;
    customer_name: string;
    customer_email: string;
    supplier_id: number;
    supplier_name: string;
    supplier_email: string;
    total_amount: string;
    payment_method: 'cash' | 'online';
    payment_status: 'paid' | 'unpaid' | 'refunded';
    bill_date: string;
    paid_at: string | null;
    created_at: string;
}

export default function BillsPage() {
    const { showToast } = useToast();
    const searchParams = useSearchParams();
    const billIdParam = searchParams.get('bill_id');
    const [bills, setBills] = useState<Bill[]>([]);
    const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
    const [loading, setLoading] = useState(true);
    const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>('all');

    useEffect(() => {
        if (billIdParam) {
            fetchBillByBillId(billIdParam);
        } else {
            fetchBills();
        }
    }, [filterPaymentStatus, billIdParam]);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterPaymentStatus !== 'all') {
                params.append('payment_status', filterPaymentStatus);
            }
            const queryString = params.toString();
            const url = `/bills${queryString ? `?${queryString}` : ''}`;
            const response = await api.get<{ bills: Bill[] }>(url);
            if (response.success && response.data) {
                setBills(response.data.bills);
                setSelectedBill(null);
            } else {
                showToast('Failed to fetch bills', 'error');
            }
        } catch (error) {
            console.error('Fetch bills error:', error);
            showToast('Failed to fetch bills', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchBillByBillId = async (id: string) => {
        setLoading(true);
        try {
            const response = await api.get<{ bill: Bill }>(`/bills/by-bill-id/${id}`);
            if (response.success && response.data) {
                setSelectedBill(response.data.bill);
            } else {
                showToast('Bill not found', 'error');
                setSelectedBill(null);
                fetchBills();
            }
        } catch (error) {
            console.error('Fetch bill error:', error);
            showToast('Failed to fetch bill', 'error');
            setSelectedBill(null);
            fetchBills();
        } finally {
            setLoading(false);
        }
    };

    const getPaymentStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'paid':
                return 'badge badge-customer';
            case 'unpaid':
                return 'badge badge-supplier';
            case 'refunded':
                return 'badge badge-admin';
            default:
                return 'badge';
        }
    };

    const formatCurrency = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return `$${num.toFixed(2)}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                <div className="text-center">
                    <div className="w-12 h-12 border-4 rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#10B981', borderTopColor: 'transparent' }}></div>
                    <p className="font-light" style={{ color: 'var(--color-text-secondary)' }}>Loading bills...</p>
                </div>
            </div>
        );
    }

    // Show single bill view if selected
    if (selectedBill) {
        return (
            <div className="min-h-screen p-8" style={{ backgroundColor: '#f5f5f5' }}>
                <div className="max-w-4xl mx-auto">
                    <div style={{ marginBottom: '2rem' }}>
                        <button
                            onClick={() => {
                                setSelectedBill(null);
                                window.history.pushState({}, '', '/dashboard/bills');
                                fetchBills();
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: 'white',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                marginBottom: '1rem',
                                fontSize: '0.875rem',
                                color: '#374151',
                                fontWeight: 500
                            }}
                        >
                            ← Back to Bills
                        </button>
                    </div>

                    {/* Professional Bill */}
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        padding: '3rem',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        maxWidth: '800px',
                        margin: '0 auto'
                    }}>
                        {/* Bill Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '2px solid #E5E7EB' }}>
                            <div>
                                <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>CUSTOMER BILL</h1>
                                <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>Bill #{selectedBill.bill_id}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>Date</div>
                                <div style={{ fontWeight: 600, color: '#111827' }}>{formatDate(selectedBill.bill_date)}</div>
                                {selectedBill.paid_at && (
                                    <>
                                        <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '1rem', marginBottom: '0.25rem' }}>Paid Date</div>
                                        <div style={{ fontWeight: 600, color: '#10B981' }}>{formatDate(selectedBill.paid_at)}</div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bill To / From */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '3rem', marginBottom: '3rem' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                    Bill To (Customer)
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111827', marginBottom: '0.5rem' }}>
                                    {selectedBill.customer_name}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: '1.6' }}>
                                    {selectedBill.customer_email}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                                    Issued By (Supplier)
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '1rem', color: '#111827', marginBottom: '0.5rem' }}>
                                    {selectedBill.supplier_name}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: '1.6' }}>
                                    {selectedBill.supplier_email}
                                </div>
                            </div>
                        </div>

                        {/* Bill Table */}
                        <div style={{ marginBottom: '2rem' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                                        <th style={{ textAlign: 'left', padding: '1rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Description
                                        </th>
                                        <th style={{ textAlign: 'right', padding: '1rem 0', fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Amount
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                                        <td style={{ padding: '2rem 0', fontSize: '1rem', color: '#111827' }}>
                                            <div style={{ fontWeight: 500 }}>Bin Rental Service</div>
                                            <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                                Booking ID: {selectedBill.service_request_code}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '2rem 0', fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                                            {formatCurrency(selectedBill.total_amount)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '2rem' }}>
                            <div style={{ width: '300px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', marginTop: '0.5rem', borderTop: '2px solid #111827' }}>
                                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Total Amount</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981' }}>
                                        {formatCurrency(selectedBill.total_amount)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Info */}
                        <div style={{ paddingTop: '2rem', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                    Payment Method
                                </div>
                                <span className="badge badge-customer">
                                    {selectedBill.payment_method.toUpperCase()}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                    Payment Status
                                </div>
                                <span className={getPaymentStatusBadgeClass(selectedBill.payment_status)}>
                                    {selectedBill.payment_status.charAt(0).toUpperCase() + selectedBill.payment_status.slice(1)}
                                </span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #E5E7EB', textAlign: 'center' }}>
                            <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                Generated by Bin Rental System on {formatDate(new Date().toISOString())}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div className="max-w-7xl mx-auto">
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Customer Bills</h1>
                    <p style={{ color: 'var(--color-text-secondary)' }}>View and manage bills between customers and suppliers</p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            Payment Status
                        </label>
                        <select
                            value={filterPaymentStatus}
                            onChange={(e) => setFilterPaymentStatus(e.target.value)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'white',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                </div>

                {/* Bills Table */}
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Bill ID</th>
                                <th>Booking Code</th>
                                <th>Customer</th>
                                <th>Supplier</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {bills.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-secondary)' }}>
                                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧾</div>
                                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No Bills Found</div>
                                        <div style={{ fontSize: '0.875rem' }}>
                                            {filterPaymentStatus !== 'all'
                                                ? 'Try adjusting your filters'
                                                : 'Bills are created when bookings are confirmed'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                bills.map((bill) => (
                                    <tr key={bill.id}>
                                        <td>
                                            <button
                                                onClick={() => setSelectedBill(bill)}
                                                style={{
                                                    fontFamily: 'monospace',
                                                    fontSize: '0.875rem',
                                                    color: '#3B82F6',
                                                    backgroundColor: 'transparent',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                            >
                                                {bill.bill_id}
                                            </button>
                                        </td>
                                        <td>
                                            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{bill.service_request_code}</span>
                                        </td>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{bill.customer_name}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <div>
                                                <div style={{ fontWeight: 500 }}>{bill.supplier_name}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: '#10B981' }}>{formatCurrency(bill.total_amount)}</span>
                                        </td>
                                        <td>
                                            <span className={getPaymentStatusBadgeClass(bill.payment_status)}>
                                                {bill.payment_status.charAt(0).toUpperCase() + bill.payment_status.slice(1)}
                                            </span>
                                        </td>
                                        <td>{formatDate(bill.bill_date)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
