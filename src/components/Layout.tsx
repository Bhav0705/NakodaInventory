import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

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

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-col border-r border-slate-800 bg-slate-950 px-3 py-4">
        <div className="mb-6 text-lg font-semibold text-slate-100">
          Nakoda Inventory
        </div>
        <nav className="flex flex-col gap-1 text-sm">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-md px-3 py-2 ${
                  active
                    ? 'bg-slate-800 text-slate-50'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
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
      <main className="flex-1 bg-slate-900 p-6 text-slate-100">{children}</main>
    </div>
  );
};

export default Layout;
