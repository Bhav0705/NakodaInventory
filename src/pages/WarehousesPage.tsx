// src/pages/WarehousesPage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface AssignedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  status: "active" | "inactive";
  assignedUsers?: AssignedUser[]; // 👈 NEW
}

const WarehousesPage: React.FC = () => {
  const { user } = useAuth();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // create form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");

  // filters / search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "active" | "inactive">("all");

  async function load() {
    try {
      const res = await api.get("/warehouses");
      const ws: Warehouse[] = (res.data ?? []).map((w: any) => ({
        id: w.id || w._id || w.code,
        name: w.name,
        code: w.code,
        address: w.address,
        status: w.status,
        assignedUsers: w.assignedUsers || [], // 👈 GET FROM API
      }));
      setWarehouses(ws);
      setErr("");
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");

    if (!name.trim() || !code.trim()) {
      setErr("Name and code are required");
      return;
    }

    try {
      await api.post("/warehouses", {
        name: name.trim(),
        code: code.trim(),
        address: address.trim() || undefined,
      });
      setName("");
      setCode("");
      setAddress("");
      setMsg("Warehouse created");
      setLoading(true);
      await load();
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to create warehouse");
    }
  }

  async function toggleStatus(id: string, current: string) {
    const next = current === "active" ? "inactive" : "active";
    if (
      !window.confirm(
        `Are you sure you want to mark this warehouse as ${next.toUpperCase()}?`
      )
    ) {
      return;
    }

    try {
      await api.patch(`/warehouses/${id}`, {
        status: next,
      });
      setLoading(true);
      await load();
    } catch {
      alert("Failed to change status");
    }
  }

  const assignedIds = user?.warehouses ?? [];

  // stats
  const total = warehouses.length;
  const activeCount = warehouses.filter((w) => w.status === "active").length;
  const inactiveCount = total - activeCount;

  // filtering
  const filtered = warehouses.filter((w) => {
    const q = search.trim().toLowerCase();
    if (q) {
      const haystack = `${w.name} ${w.code} ${w.address || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (statusFilter !== "all" && w.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 px-3 py-4 text-slate-100 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Warehouse Master
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              Clean list of all warehouses. Super admin can create / activate /
              deactivate.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-emerald-400 hover:text-emerald-300"
          >
            Refresh
          </button>
        </header>

        {/* Top stats strip */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs">
          <div className="text-slate-300">
            Total warehouses:{" "}
            <span className="font-semibold text-slate-100">{total}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active: <b className="ml-1">{activeCount}</b>
            </span>
            <span className="inline-flex items-center rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-rose-300">
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-rose-400" />
              Inactive: <b className="ml-1">{inactiveCount}</b>
            </span>
          </div>
        </div>

        {/* Messages */}
        {err && (
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {err}
          </div>
        )}
        {msg && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            {msg}
          </div>
        )}

        <div className="grid items-start gap-4 md:grid-cols-[1.6fr,1fr]">
          {/* LEFT: List + filters card */}
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-sm shadow-lg">
            {/* Filters row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-300">
                  Search (name / code / address)
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. Sales Office, WH-01"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>
              <div className="w-full space-y-1 sm:w-40">
                <label className="text-xs text-slate-300">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "active" | "inactive"
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Loading warehouses...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No warehouses match filters.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="min-w-full border-collapse text-xs sm:text-sm">
                  <thead className="bg-slate-900 text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Code</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Address
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Access
                      </th>
                      {user?.role === "super_admin" && (
                        <th className="px-3 py-2 text-left font-medium">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((w) => {
                      const isAssigned = assignedIds.includes(w.id);
                      const people =
                        (w.assignedUsers || []).filter(
                          (u) => u.role !== "super_admin"
                        ) ?? [];

                      return (
                        <tr
                          key={w.id}
                          className="border-t border-slate-800 hover:bg-slate-900/70"
                        >
                          <td className="px-3 py-2 align-top text-slate-100">
                            <div className="font-medium">{w.name}</div>
                            <div className="text-[11px] text-slate-500">
                              ID: {w.id}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-1 text-[11px] font-mono text-slate-200">
                              {w.code}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-top text-slate-200">
                            {w.address ? (
                              <span className="line-clamp-2 text-xs">
                                {w.address}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                No address
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                w.status === "active"
                                  ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                                  : "border border-rose-500/40 bg-rose-500/10 text-rose-300"
                              }`}
                            >
                              <span
                                className={`mr-1 h-1.5 w-1.5 rounded-full ${
                                  w.status === "active"
                                    ? "bg-emerald-400"
                                    : "bg-rose-400"
                                }`}
                              />
                              {w.status.toUpperCase()}
                            </span>
                          </td>

                          {/* ACCESS COLUMN */}
                          <td className="px-3 py-2 align-top">
                            {user?.role === "super_admin" ? (
                              people.length === 0 ? (
                                <span className="text-[11px] text-slate-500">
                                  No user assigned
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {people.map((u) => (
                                    <span
                                      key={u.id}
                                      className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[11px] text-sky-200"
                                    >
                                      {u.name}
                                    </span>
                                  ))}
                                </div>
                              )
                            ) : isAssigned ? (
                              <span className="inline-flex items-center rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-300">
                                Assigned to you
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500">
                                Not in your list
                              </span>
                            )}
                          </td>

                          {user?.role === "super_admin" && (
                            <td className="px-3 py-2 align-top">
                              <button
                                onClick={() => toggleStatus(w.id, w.status)}
                                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1 text-[11px] text-slate-100 hover:border-orange-500 hover:text-orange-300"
                              >
                                {w.status === "active" ? "Disable" : "Enable"}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT: Create + notes */}
          <div className="space-y-4">
            {/* Create form */}
            {user?.role === "super_admin" && (
              <form
                onSubmit={handleCreate}
                className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs sm:text-sm"
              >
                <div className="mb-1 text-sm font-semibold text-slate-100">
                  Create warehouse
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      placeholder="e.g. Delhi Main Warehouse"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      Code <span className="text-rose-400">*</span>
                    </label>
                    <input
                      placeholder="e.g. WH-DEL-01"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">
                      Address (optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Street, city, state, pincode"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-1 inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-orange-400"
                >
                  Create Warehouse
                </button>
              </form>
            )}

            {/* Notes */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
              <div className="mb-1 text-sm font-semibold text-slate-100">
                Usage notes
              </div>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Use only active warehouses for GRN / Dispatch / Transfer.</li>
                <li>
                  Inactive = cannot be used for new stock movement, but history
                  stays safe.
                </li>
                <li>
                  Manager access (who can see which warehouse) is controlled in
                  user settings.
                </li>
                <li>
                  Use clear codes like WH-DEL-01, WH-MUM-01 for reports and
                  filters.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehousesPage;
