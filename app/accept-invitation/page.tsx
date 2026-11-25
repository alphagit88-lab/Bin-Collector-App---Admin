'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface AcceptResult {
  success: boolean;
  message?: string;
  alreadyAccepted?: boolean;
  supplierName?: string;
  customerName?: string;
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AcceptResult | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setResult({
        success: false,
        message: 'No invitation token provided. Please check the link from your email.',
      });
      return;
    }

    const acceptInvitation = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/supplier/customers/accept?token=${encodeURIComponent(token)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();
        setResult(data);
      } catch (err: any) {
        console.error('Accept invitation error:', err);
        setResult({
          success: false,
          message: 'Unable to connect to the server. Please try again later.',
        });
      } finally {
        setLoading(false);
      }
    };

    acceptInvitation();
  }, [token]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        {/* BinDrop Logo Header */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center justify-center bg-[#050504] px-5 py-2.5 rounded-xl shadow-sm">
            <img
              src="/logo-bd.png"
              alt="BinDrop"
              className="w-40 sm:w-44 h-auto object-contain block"
            />
          </div>
        </div>

        {loading ? (
          <div>
            <div className="w-12 h-12 border-4 border-[#29B554] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Invitation</h2>
            <p className="text-sm text-gray-500">Connecting your account with your supplier...</p>
          </div>
        ) : result?.success ? (
          result.alreadyAccepted ? (
            /* Already Accepted state */
            <div>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Already Connected</h2>
              <p className="text-sm text-gray-600 mb-6">
                You have already accepted this invitation. Your account is active with{' '}
                <span className="font-semibold text-gray-800">
                  {result.supplierName || 'your supplier'}
                </span>
                .
              </p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full py-3 px-4 bg-gradient-to-r from-[#29B554] to-[#6EAD16] hover:opacity-95 text-white font-semibold rounded-xl transition duration-150 shadow-md shadow-green-500/20 text-center"
                >
                  Sign In to Account
                </Link>
                <Link
                  href="/open-app"
                  className="block w-full py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition duration-150 text-center"
                >
                  Open in Mobile App
                </Link>
              </div>
            </div>
          ) : (
            /* Successfully Accepted state */
            <div>
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Accepted!</h2>
              {result.customerName && (
                <p className="text-sm text-gray-700 font-medium mb-1">
                  Welcome, {result.customerName}!
                </p>
              )}
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                You are now connected with{' '}
                <span className="font-semibold text-gray-900">
                  {result.supplierName || 'your supplier'}
                </span>
                . Your account is now active and ready to place or manage bin rental orders.
              </p>
              <div className="space-y-3">
                <Link
                  href="/login"
                  className="block w-full py-3 px-4 bg-gradient-to-r from-[#29B554] to-[#6EAD16] hover:opacity-95 text-white font-semibold rounded-xl transition duration-150 shadow-md shadow-green-500/20 text-center"
                >
                  Sign In to Your Account
                </Link>
                <Link
                  href="/open-app"
                  className="block w-full py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition duration-150 text-center"
                >
                  Open BinDrop App
                </Link>
              </div>
            </div>
          )
        ) : (
          /* Error / Invalid state */
          <div>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitation Unavailable</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {result?.message || 'This invitation link is invalid or has already expired. If you need access, please ask your supplier to re-send your invitation.'}
            </p>
            <Link
              href="/login"
              className="block w-full py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition duration-150 text-center"
            >
              Go to Sign In
            </Link>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400">
          BinDrop &copy; {new Date().getFullYear()} &middot; Simple Bin Rentals &amp; Waste Management
        </div>
      </div>
    </main>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#29B554] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </main>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
