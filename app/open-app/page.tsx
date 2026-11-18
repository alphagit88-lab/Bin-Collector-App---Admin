'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function OpenAppPage() {
  const [attempted, setAttempted] = useState(false);

  const APP_SCHEME = 'com.binrental.mobile://';
  const ANDROID_INTENT = 'intent://#Intent;scheme=com.binrental.mobile;package=com.binrental.mobile;end';
  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.binrental.mobile';

  const triggerOpenApp = () => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    const isIOS = /iphone|ipad|ipod/i.test(ua);

    if (isAndroid) {
      // Android Chrome intent launches the installed app directly
      window.location.href = ANDROID_INTENT;
    } else if (isIOS) {
      window.location.href = APP_SCHEME;
    } else {
      window.location.href = APP_SCHEME;
    }
  };

  useEffect(() => {
    // Attempt automatic app launch immediately on page load
    triggerOpenApp();
    const timer = setTimeout(() => {
      setAttempted(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
        {/* BinDrop Logo or App Icon */}
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <svg className="w-9 h-9 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Opening BinDrop App</h1>
        <p className="text-sm text-gray-600 mb-6">
          We&apos;re launching the BinDrop mobile app on your device...
        </p>

        <div className="space-y-3">
          <button
            onClick={triggerOpenApp}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition duration-150 shadow-md shadow-emerald-500/20 active:scale-[0.99] cursor-pointer"
          >
            Open BinDrop App
          </button>

          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-block py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition duration-150 text-sm"
          >
            Download on Google Play
          </a>

          <Link
            href="/login"
            className="w-full inline-block py-2.5 px-4 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-xl transition duration-150 text-sm"
          >
            Continue in Web Browser
          </Link>
        </div>

        {attempted && (
          <p className="mt-6 text-xs text-gray-400">
            If prompted by your device to open an external app, tap &quot;Open&quot;.
          </p>
        )}
      </div>
    </main>
  );
}

