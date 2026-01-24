import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type DashboardSummary = {
  warehouses: number;
  products: number;
  grnToday: number;
  pendingDispatch: number;
};


const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary>({
    warehouses: 0,
    products: 0,
    grnToday: 0,
    pendingDispatch: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Dashboard | Inventory Control";

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API}/dashboard/summary`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Bad response:", res.status, text);
          throw new Error(`Request failed with status ${res.status}`);
        }

        const data = await res.json();

        if (!data?.success) {
          throw new Error(data?.message || "Failed to load dashboard data");
        }

        setSummary(data.data as DashboardSummary);
      } catch (err: any) {
        console.error("Dashboard summary error:", err);
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const stats = [
    {
      label: "Warehouses",
      value: summary.warehouses,
      hint: "Total active locations",
    },
    {
      label: "Products",
      value: summary.products,
      hint: "Live SKUs in system",
    },
    {
      label: "GRN Today",
      value: summary.grnToday,
      hint: "Goods received today",
    },
    {
      label: "Pending Dispatch",
      value: summary.pendingDispatch,
      hint: "Orders to be shipped",
    },
  ];

  return (
    <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
              Dashboard
            </h1>
            <p className="mt-1 text-xs text-slate-300 sm:text-sm">
              Welcome back{" "}
              <span className="font-medium text-slate-50">
                {user?.name || "User"}
              </span>
              . Review your ERP overview and jump into key actions.
            </p>
          </div>

          <div className="flex justify-center sm:justify-end">
            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 shadow-sm">
              <div className="flex flex-col text-xs sm:text-sm">
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                  Logged in as
                </span>
                <span className="text-sm font-semibold text-slate-50 capitalize">
                  {user?.role || "Role"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Error message */}
        {error && (
          <div className="rounded-xl border border-rose-500/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {/* Overview stats */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
            Overview
          </h2>
          <div className="grid gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 shadow-sm"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                  {item.label}
                </p>
                <p className="mt-2 text-xl font-semibold text-slate-50 sm:text-2xl">
                  {loading ? "--" : item.value}
                </p>
                <p className="mt-1 text-xs text-slate-400">{item.hint}</p>
              </div>
            ))}
          </div>
        </section>

    
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
            Quick Actions
          </h2>

          <div className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Link
              to="/warehouses"
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-500/70 hover:bg-slate-900 hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-slate-50 sm:text-base">
                  Warehouses
                </p>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                  Manage locations, capacity & stock.
                </p>
              </div>
              <span className="mt-3 text-[11px] font-medium text-sky-400 opacity-0 transition group-hover:opacity-100">
                Open warehouses →
              </span>
            </Link>

            <Link
              to="/products"
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-500/70 hover:bg-slate-900 hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-slate-50 sm:text-base">
                  Products
                </p>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                  Add, update and control master inventory.
                </p>
              </div>
              <span className="mt-3 text-[11px] font-medium text-emerald-400 opacity-0 transition group-hover:opacity-100">
                Go to products →
              </span>
            </Link>

            <Link
              to="/grn"
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-500/70 hover:bg-slate-900 hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-slate-50 sm:text-base">
                  GRN (Goods Inward)
                </p>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                  Record incoming stock by PO, supplier and warehouse.
                </p>
              </div>
              <span className="mt-3 text-[11px] font-medium text-amber-400 opacity-0 transition group-hover:opacity-100">
                Create GRN →
              </span>
            </Link>

            <Link
              to="/dispatch"
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-500/70 hover:bg-slate-900 hover:shadow-md"
            >
              <div>
                <p className="text-sm font-semibold text-slate-50 sm:text-base">
                  Dispatch
                </p>
                <p className="mt-1 text-xs text-slate-400 sm:text-sm">
                  Track orders, allocate stock and confirm outward.
                </p>
              </div>
              <span className="mt-3 text-[11px] font-medium text-rose-400 opacity-0 transition group-hover:opacity-100">
                Open dispatch →
              </span>
            </Link>
          </div>
        </section>

        {/* Helper section */}
        <section className="grid gap-4 border-t border-slate-800 pt-5 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:text-sm">
              How to use this panel
            </h3>
            <p className="text-xs text-slate-300 sm:text-sm">
              Use the left navigation to switch between warehouses, product
              master data and inventory movements like GRN (inward) and Dispatch
              (outward). Ensure every GRN and Dispatch is mapped to the correct
              warehouse to keep stock levels accurate.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-300 sm:text-sm">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">
              Shortcuts
            </h4>
            <ul className="mt-2 space-y-1 text-[11px] text-slate-400 sm:text-xs">
              <li>• Start your day with GRN & Dispatch review.</li>
              <li>• Keep product master data clean (SKU, MRP, HSN).</li>
              <li>• Check overview cards for potential stock issues.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
