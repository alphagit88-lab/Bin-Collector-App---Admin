'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const pageLabels: Record<string, string> = {
  account: 'Account',
  billing: 'Billing',
  bookings: 'Bookings',
  'create-order': 'Create Order',
  customers: 'Customers',
  dashboard: 'Dashboard',
  earnings: 'Earnings',
  fleet: 'Fleet',
  invoices: 'Invoices',
  jobs: 'Jobs',
  login: 'Login',
  messages: 'Messages',
  notifications: 'Notifications',
  order: 'Order New Bin',
  projects: 'Projects',
  requests: 'Requests',
  settings: 'Settings',
  signup: 'Sign Up',
  tracking: 'Tracking',
};

const titleCase = (value: string) => value
  .split('-')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

export default function DocumentTitle() {
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    if (!pathname || pathname === '/') {
      document.title = 'BinDrop';
      return;
    }

    const segments = pathname.split('/').filter(Boolean);
    const publicPage = segments[0];
    if (publicPage === 'login' || publicPage === 'signup') {
      document.title = `BinDrop – ${pageLabels[publicPage]}`;
      return;
    }

    if (publicPage !== 'dashboard') {
      const segment = segments.at(-1) || publicPage;
      document.title = `BinDrop – ${pageLabels[segment] || titleCase(segment)}`;
      return;
    }

    const role = user?.role ? titleCase(user.role) : '';
    const knownPageSegment = [...segments].reverse().find(segment => pageLabels[segment]);
    const page = knownPageSegment && knownPageSegment !== 'dashboard'
      ? pageLabels[knownPageSegment]
      : 'Dashboard';
    document.title = `BinDrop – ${[role, page].filter(Boolean).join(' ')}`;
  }, [pathname, user?.role]);

  return null;
}
