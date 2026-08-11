import React from 'react';

interface BillTemplateProps {
  data: {
    invoice_number: string;
    amount: string;
    status: string;
    created_at: string;
    service_request_number: string;
    payment_method?: string;
  };
  user: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export default function BillTemplate({ data, user }: BillTemplateProps) {
  const isPaid = data.status.toLowerCase() === 'paid';
  const amountNumber = parseFloat(data.amount);

  return (
    <div className="bg-white text-gray-800 p-10 max-w-4xl mx-auto font-sans" id="document-template">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-1">BinDrop</h1>
          <p className="text-gray-500 text-sm">Professional Bin Rental Services</p>
          <div className="mt-4 text-sm text-gray-600">
            <p>123 Bin Rental Ave.</p>
            <p>Toronto, ON, M1M 1M1</p>
            <p>contact@bindrop.ai</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-light uppercase tracking-wider text-gray-400 mb-2">BILL</h2>
          <p className="text-xl font-semibold text-gray-900">#{data.invoice_number}</p>
          <div className="mt-4 text-sm">
            <p><span className="text-gray-500 mr-2">Date:</span> {new Date(data.created_at).toLocaleDateString()}</p>
            <p><span className="text-gray-500 mr-2">Order Ref:</span> #{data.service_request_number || 'N/A'}</p>
            <p className="mt-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isPaid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {data.status}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Bill To / From */}
      <div className="mb-10">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">
          Payable To:
        </h3>
        <div className="text-base text-gray-700">
          <p className="font-bold text-gray-900 text-lg mb-1">{user.name}</p>
          <p>{user.email}</p>
          {user.phone && <p>{user.phone}</p>}
          {user.address && <p>{user.address}</p>}
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900 text-gray-800 text-sm">
              <th className="py-3 font-bold uppercase tracking-wider">Description</th>
              <th className="py-3 font-bold uppercase tracking-wider text-center">Qty</th>
              <th className="py-3 font-bold uppercase tracking-wider text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr>
              <td className="py-4">
                <p className="font-semibold text-gray-900">Bin Rental Service</p>
                <p className="text-sm text-gray-500">Order #{data.service_request_number}</p>
              </td>
              <td className="py-4 text-center text-gray-700">1</td>
              <td className="py-4 text-right font-semibold text-gray-900">${amountNumber.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-16">
        <div className="w-1/2">
          <div className="flex justify-between py-2 text-sm text-gray-600">
            <span>Subtotal</span>
            <span>${amountNumber.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-200">
            <span>Tax (Included)</span>
            <span>$0.00</span>
          </div>
          <div className="flex justify-between py-4 text-xl font-bold text-gray-900">
            <span>Total</span>
            <span>${amountNumber.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-8 text-center text-gray-500 text-sm">
        <p className="mb-1">Thank you for your business!</p>
        <p>If you have any questions about this bill, please contact us at contact@bindrop.ai</p>
      </div>

      {/* Global Print Styles applied when rendering this component */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #document-template, #document-template * {
              visibility: visible;
            }
            #document-template {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0 !important;
            }
            /* Hide the default dashboard layout padding/margins */
            main, .dashboard-layout {
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `
      }} />
    </div>
  );
}
