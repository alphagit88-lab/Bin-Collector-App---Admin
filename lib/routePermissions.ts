export type UserRole = 'admin' | 'customer' | 'supplier' | 'driver';

/**
 * Checks if the given path is a customer-only route.
 */
export function isCustomerRoute(pathname: string): boolean {
  return pathname === '/dashboard/customer' || pathname.startsWith('/dashboard/customer/');
}

/**
 * Checks if the given path is a supplier-only route.
 */
export function isSupplierRoute(pathname: string): boolean {
  return pathname === '/dashboard/supplier' || pathname.startsWith('/dashboard/supplier/');
}

/**
 * Checks if the given path is a shared route accessible to all authenticated users.
 */
export function isSharedRoute(pathname: string): boolean {
  return (
    pathname === '/dashboard/messages' ||
    pathname.startsWith('/dashboard/messages/') ||
    pathname === '/dashboard/notifications' ||
    pathname.startsWith('/dashboard/notifications/')
  );
}

/**
 * Checks if the given path is an admin-only route.
 */
export function isAdminRoute(pathname: string): boolean {
  const adminPrefixes = [
    '/dashboard/bills',
    '/dashboard/bin-management',
    '/dashboard/bin-pricing',
    '/dashboard/bins',
    '/dashboard/bookings',
    '/dashboard/customer-invoices',
    '/dashboard/invoices',
    '/dashboard/payouts',
    '/dashboard/service-categories',
    '/dashboard/settings',
    '/dashboard/transactions',
    '/dashboard/users',
    '/dashboard/wallets',
  ];

  return adminPrefixes.some(
    prefix => pathname === prefix || pathname.startsWith(prefix + '/')
  );
}

/**
 * Returns the default authorized dashboard home URL for a given role.
 */
export function getDefaultDashboard(role?: string): string {
  switch (role) {
    case 'customer':
      return '/dashboard/customer';
    case 'supplier':
      return '/dashboard';
    case 'admin':
      return '/dashboard';
    case 'driver':
      return '/mobile/driver/dashboard';
    default:
      return '/login';
  }
}

/**
 * Determines whether a role is authorized to view a specific pathname under /dashboard.
 */
export function isRouteAllowedForRole(role: UserRole | undefined, pathname: string): boolean {
  if (!role) return false;

  // Shared routes are accessible to all authenticated dashboard users
  if (isSharedRoute(pathname)) {
    return true;
  }

  // Customer: only allowed on /dashboard/customer and its subpaths
  if (role === 'customer') {
    return isCustomerRoute(pathname);
  }

  // Supplier: allowed on /dashboard and /dashboard/supplier/*
  if (role === 'supplier') {
    if (pathname === '/dashboard') return true;
    return isSupplierRoute(pathname);
  }

  // Admin: allowed on /dashboard and admin-only routes
  if (role === 'admin') {
    if (pathname === '/dashboard') return true;
    return isAdminRoute(pathname);
  }

  // Drivers have their dedicated mobile interface
  if (role === 'driver') {
    return false;
  }

  return false;
}
