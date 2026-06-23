'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

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

  useEffect(() => {
    if (user?.canViewBilling) {
      fetchInvoices();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchInvoices = async () => {
    try {
      const response = await api.get<{ invoices: Invoice[] }>('/billing/invoices');
      if (response.success && response.data) {
        setInvoices(response.data.invoices);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
      showToast('Failed to load invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    // Since there's no dedicated backend PDF endpoint, we simulate a PDF download
    // by triggering a print dialog which users can "Save as PDF"
    showToast('Preparing PDF for download. Please select "Save as PDF" in the print dialog.', 'success');
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!user?.canViewBilling) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 flex items-center justify-center">
        <div className="dashboard-card rounded-lg p-8 bg-white shadow-sm border border-gray-100 max-w-lg text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            Your billing section is currently disabled. Please contact the administrator to enable invoice viewing for your account.
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
              <p className="text-green-100 font-medium">View and manage your invoices</p>
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
        <div className="space-y-4 printable-area">
          {invoices.length === 0 ? (
            <div className="dashboard-card rounded-lg p-12 bg-white shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">No Invoices Found</h3>
              <p className="text-gray-500">You don't have any invoices yet.</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="dashboard-card bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between transition-all hover:shadow-md">
                
                {/* Left side info */}
                <div className="flex-1 flex flex-col md:flex-row md:items-center w-full">
                  <div className="mb-4 md:mb-0 md:mr-8">
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Invoice Number</p>
                    <p className="text-lg font-bold text-gray-800">{invoice.invoice_number}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(invoice.created_at).toLocaleDateString()}</p>
                  </div>
                  
                  <div className="mb-4 md:mb-0 md:mr-8 hidden md:block w-px h-12 bg-gray-100"></div>
                  
                  <div className="mb-4 md:mb-0 md:mr-8">
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Order ID</p>
                    <p className="font-semibold text-gray-700">#{invoice.service_request_number}</p>
                  </div>

                  <div className="mb-4 md:mb-0 md:mr-8 hidden md:block w-px h-12 bg-gray-100"></div>

                  <div className="mb-4 md:mb-0 md:mr-8 flex-1">
                    <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-1">Amount</p>
                    <p className="text-xl font-bold text-gray-800">${parseFloat(invoice.amount).toFixed(2)}</p>
                  </div>
                </div>

                {/* Right side actions */}
                <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full md:w-auto mt-4 md:mt-0">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider w-full sm:w-auto text-center ${
                    invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 
                    invoice.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {invoice.status}
                  </span>
                  
                  <button 
                    onClick={() => handleDownloadPDF(invoice)}
                    className="w-full sm:w-auto bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg transition-colors flex items-center justify-center whitespace-nowrap"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Download PDF
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Hide printable-area components in browser, only show them when printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-area, .printable-area * {
            visibility: visible;
          }
          .printable-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button {
            display: none !important;
          }
        }
      `}} />
    </div>
  );
}
