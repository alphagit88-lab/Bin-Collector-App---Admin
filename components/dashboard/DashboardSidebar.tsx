'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === path;
    }
    return pathname?.startsWith(path);
  };

  // Admin navigation items
  const adminNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
    },
    {
      label: 'User Management',
      href: '/dashboard/users',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      ),
      children: [
        {
          label: 'Customers',
          href: '/dashboard/users/customers',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          ),
        },
        {
          label: 'Suppliers',
          href: '/dashboard/users/suppliers',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          ),
        },
        {
          label: 'Admins',
          href: '/dashboard/users/admins',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
          ),
        },
      ],
    },
    {
      label: 'Bin Management',
      href: '/dashboard/bins',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="18" rx="2" ry="2"></rect>
          <line x1="7" y1="3" x2="7" y2="21"></line>
          <line x1="17" y1="3" x2="17" y2="21"></line>
        </svg>
      ),
    },
    {
      label: 'Transactions',
      href: '/dashboard/transactions',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
    },
    {
      label: 'Bookings',
      href: '/dashboard/bookings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
    },
    {
      label: 'Wallets',
      href: '/dashboard/wallets',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      ),
    },
    {
      label: 'Payouts',
      href: '/dashboard/payouts',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
    },
    {
      label: 'Invoices',
      href: '/dashboard/invoices',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      ),
    },
    {
      label: 'System Settings',
      href: '/dashboard/settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
        </svg>
      ),
    },
  ];

  const navItems: NavItem[] = user?.role === 'admin' ? adminNavItems : [];

  // Auto-expand/collapse menus based on active page
  useEffect(() => {
    const newExpandedMenus: Record<string, boolean> = {};
    
    navItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => isActive(child.href));
        newExpandedMenus[item.href] = hasActiveChild;
      }
    });
    
    setExpandedMenus(newExpandedMenus);
  }, [pathname]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen z-50 transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64 bg-[#002418]`}
        style={{ borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-6" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.3)' }}>
            <Link href="/dashboard" className="flex items-center justify-center group">
              <i className="fas fa-recycle text-white text-2xl mr-3"></i>
              <span className="text-lg font-semibold text-white tracking-tight">BinRental</span>
            </Link>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden absolute top-6 right-6 p-2 rounded-md transition-colors"
            style={{ backgroundColor: 'transparent', color: 'white' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-2 sidebar-scroll">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedMenus[item.href] || false;
              const isParentActive = hasChildren && item.children?.some(child => isActive(child.href));

              return (
                <div key={item.href}>
                  <div className="flex items-center">
                    <Link
                      href={item.href}
                      onClick={(e) => {
                        if (hasChildren) {
                          e.preventDefault();
                          setExpandedMenus(prev => ({ ...prev, [item.href]: !isExpanded }));
                        } else {
                          setIsOpen(false);
                        }
                      }}
                      className={`flex items-center space-x-2 px-4 py-3 rounded-md transition-colors flex-1 ${
                        active || isParentActive
                          ? 'dashboard-nav-active'
                          : 'dashboard-nav-inactive'
                      }`}
                    >
                      <span>
                        {item.icon}
                      </span>
                      <span className="font-medium text-sm">{item.label}</span>
                    </Link>
                    {hasChildren && (
                      <button
                        onClick={() => setExpandedMenus(prev => ({ ...prev, [item.href]: !isExpanded }))}
                        className="px-2 py-3 text-white opacity-60 hover:opacity-100 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        >
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </button>
                    )}
                  </div>
                  {hasChildren && isExpanded && (
                    <div className="ml-4 mt-1 space-y-1 p-2 rounded-tl-none rounded-tr-md rounded-br-md rounded-bl-md" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                      {item.children?.map((child) => {
                        const childActive = isActive(child.href);
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                              childActive
                                ? 'dashboard-nav-active'
                                : 'dashboard-nav-inactive opacity-75'
                            }`}
                          >
                            <span>
                              {child.icon}
                            </span>
                            <span className="font-medium text-sm">{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm" style={{ background: 'rgba(255, 255, 255, 0.2)' }}>
                {user ? getInitials(user.name) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-white">
                  {user?.name}
                </p>
                <p className="text-xs truncate" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer"
              style={{ color: '#ffcbcb', backgroundColor: 'rgba(254, 242, 242, 0.2)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(254, 242, 242, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(254, 242, 242, 0.2)'}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 left-4 lg:hidden z-30 p-2 rounded-md shadow-md transition-colors"
        style={{ backgroundColor: '#10B981', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>
    </>
  );
}
