import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const baseNav = [
    { path: '/', label: 'Dashboard' },
    { path: '/warehouses', label: 'Warehouses' },
    { path: '/products', label: 'Products' },
    { path: '/stock', label: 'Stock Summary' },
    { path: '/grn', label: 'GRN (Goods In)' },
    { path: '/dispatch', label: 'Dispatch (Goods Out)' },
    { path: '/transfer', label: 'Transfer (WH → WH)' },
    { path: '/media-test', label: 'Media Upload Test' },
  ];

  const navItems =
    user?.role === 'super_admin'
      ? [...baseNav, { path: '/users', label: 'Users & Managers' }]
      : baseNav;

  const renderNavLinks = (onClick?: () => void) =>
    navItems.map((item) => {
      const active = location.pathname === item.path;
      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={onClick}
          className={`rounded-md px-3 py-2 text-sm ${
            active
              ? 'bg-slate-800 text-slate-50'
              : 'text-slate-300 hover:bg-slate-900'
          }`}
        >
          {item.label}
        </Link>
      );
    });

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100 md:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 md:hidden">
        <div className="flex flex-col">
          <span className="text-base font-semibold">Nakoda Inventory</span>
          {user && (
            <span className="text-xs text-slate-400">
              {user.name} • {user.role}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={logout}
              className="rounded-md border border-orange-500 px-2 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500/10"
            >
              Logout
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex items-center justify-center rounded-md border border-slate-700 p-1.5 text-slate-200 hover:bg-slate-800"
          >
            <span className="sr-only">Toggle navigation</span>
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <nav className="border-b border-slate-800 bg-slate-950 px-3 pb-3 pt-2 md:hidden">
          <div className="flex flex-col gap-1">
            {renderNavLinks(() => setMobileOpen(false))}
          </div>
        </nav>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r border-slate-800 bg-slate-950 px-3 py-4 md:flex">
        <div className="mb-6 text-lg font-semibold text-slate-100">
          Nakoda Inventory
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {renderNavLinks()}
        </nav>
        {user && (
          <div className="mt-auto pt-4 text-xs text-slate-300">
            <div className="mb-1 font-medium">{user.name}</div>
            <div className="mb-3 text-slate-400">{user.role}</div>
            <button
              onClick={logout}
              className="rounded-md border border-orange-500 px-3 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500/10"
            >
              Logout
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 px-4 pb-6 pt-4 md:p-6">
        {children}
      </main>
    </div>
  );
};

export default Layout;
