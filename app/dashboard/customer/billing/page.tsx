'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import BillTemplate from '@/components/dashboard/BillTemplate';

// Field names match mobile app's BillingScreen.tsx and backend aliases
interface Invoice {
  id: number;
  invoice_number: string;  // aliased from bill_id
  amount: string;          // aliased from total_amount
  status: string;          // aliased from payment_status
  created_at: string;      // aliased from bill_date
  service_request_number: string;
  payment_method: string;
}

export default function CustomerBillingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [printData, setPrintData] = useState<Invoice | null>(null);

  useEffect(() => {
    // Only fetch if user is allowed to view billing
    if (user?.canViewBilling !== false) {
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const response = await api.get<any>('/billing/invoices');
      
      if (response.success) {
        // The API client returns the raw response body, so invoices is at the top level
        const invoiceList = (response as any).invoices || response.data?.invoices || [];
        setInvoices(invoiceList);
      } else {
        showToast(response.message || 'Failed to load invoices', 'error');
      }
    } catch (error) {
      console.error('Failed to load invoices', error);
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    setPrintData(invoice);
    showToast('Preparing PDF for download. Please select "Save as PDF" in the print dialog.', 'success');
    
    // Allow React state to update and render the template before printing
    setTimeout(() => {
      window.print();
      // Clear print data after printing so it hides again
      setTimeout(() => setPrintData(null), 500);
    }, 500);
  };

  const filteredInvoices = invoices.filter(i =>
    !searchQuery ||
    i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (i.service_request_number && i.service_request_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-700 border-green-200';
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'void': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (user && user.canViewBilling === false) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You don't have permission to view billing information. Please contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Billing & Invoices</h1>
            <p className="text-gray-500 mt-1">Manage your payments and download invoices</p>
          </div>
        </div>

        {/* Filters/Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3.5 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Search by invoice number or order ID..."
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm" 
            />
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 rounded-full animate-spin border-green-500 border-t-transparent"></div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No invoices found</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-2 text-sm text-green-600 hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Invoice Details</th>
                    <th className="px-6 py-4 font-semibold">Order ID</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredInvoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(invoice.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 font-medium">{invoice.service_request_number || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">${parseFloat(invoice.amount).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button 
                            onClick={() => handleDownloadPDF(invoice)}
                            className="bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center whitespace-nowrap text-sm shadow-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Hidden Document Template that only shows up when printing */}
      {printData && user && (
        <BillTemplate 
          data={printData} 
          user={user} 
        />
      )}
    </div>
  );
}
