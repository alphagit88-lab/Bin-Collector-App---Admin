'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import BillTemplate from '@/components/dashboard/BillTemplate';

interface Invoice {
  id: number;
  invoice_number: string;
  amount: string;
  status: 'paid' | 'pending' | 'void';
  created_at: string;
  service_request_number: string;
}

export default function SupplierBillingPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [printData, setPrintData] = useState<Invoice | null>(null);

  useEffect(() => {
    if (user?.role === 'supplier' || user?.canViewBilling) {
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const response = await api.get<any>('/billing/invoices');
      if (response.success) {
        const invoiceList = (response as any).invoices || response.data?.invoices || [];
        setInvoices(invoiceList);
      } else {
        showToast(response.message || 'Failed to load bills', 'error');
      }
    } catch (error) {
      console.error('Error fetching bills:', error);
      showToast('Failed to load bills', 'error');
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!(user?.role === 'supplier' || user?.canViewBilling)) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="dashboard-card rounded-lg p-8 bg-white shadow-sm border border-gray-100 max-w-lg text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            Your billing section is currently disabled. Please contact the administrator to enable bill viewing for your account.
          </p>
        </div>
      </div>
    );
  }

  const totalPaid = invoices.reduce((acc, inv) => acc + (inv.status === 'paid' ? parseFloat(inv.amount) : 0), 0);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
          {/* Abstract background shapes */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10"></div>
          <div className="absolute bottom-0 right-32 -mb-24 w-48 h-48 rounded-full bg-white opacity-10"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl font-bold mb-2">Billing Center</h1>
              <p className="text-green-100 font-medium">View and manage your bills</p>
            </div>
            
            <div className="flex bg-white/20 rounded-xl p-4 backdrop-blur-sm border border-white/20">
              <div className="text-center px-4 border-r border-white/20">
                <p className="text-3xl font-bold">{invoices.length}</p>
                <p className="text-xs uppercase tracking-wider text-green-100 mt-1">Total</p>
              </div>
              <div className="text-center px-4">
                <p className="text-3xl font-bold">${totalPaid.toFixed(2)}</p>
                <p className="text-xs uppercase tracking-wider text-green-100 mt-1">Paid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden printable-area">
          {invoices.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">No bills found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Bill Details</th>
                    <th className="px-6 py-4 font-semibold">Order ID</th>
                    <th className="px-6 py-4 font-semibold">Amount</th>
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map(invoice => (
                    <tr key={invoice.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{new Date(invoice.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 font-medium">#{invoice.service_request_number || '-'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-gray-900">${parseFloat(invoice.amount).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-full border ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-700 border-green-200' : 
                            invoice.status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                            invoice.status === 'void' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-200'
                          }`}>
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
