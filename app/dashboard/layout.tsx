'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import DashboardSidebar from '@/components/dashboard/DashboardSidebar';
import { useToast } from '@/contexts/ToastContext';
import { isRouteAllowedForRole, getDefaultDashboard } from '@/lib/routePermissions';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const lastDeniedPathRef = useRef<string | null>(null);

  const isAuthorized = !user || !pathname ? false : isRouteAllowedForRole(user.role, pathname);

  useEffect(() => {
    if (authLoading) return;

    // Unauthenticated: redirect to login
    if (!user) {
      if (typeof window !== 'undefined') {
        const returnUrl = window.location.pathname + window.location.search;
        router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      } else {
        router.push('/login');
      }
      return;
    }

    // Role-based route authorization
    if (!isAuthorized) {
      // Show access denied toast only if explicitly navigating to an unauthorized foreign page (not just landing on /dashboard)
      if (pathname && pathname !== '/dashboard' && lastDeniedPathRef.current !== pathname) {
        lastDeniedPathRef.current = pathname;
        showToast('Access Denied: You do not have permission to access that page.', 'error');
      }

      const target = getDefaultDashboard(user.role);
      router.replace(target);
    } else {
      lastDeniedPathRef.current = null;
    }
  }, [authLoading, user, isAuthorized, router, pathname, showToast]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#10B981] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-light">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardSidebar />
      <div className="lg:pl-64 min-h-screen bg-gray-50">
        {children}
      </div>
    </>
  );
}
