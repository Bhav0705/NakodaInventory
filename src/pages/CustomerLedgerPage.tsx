import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../services/api";

type Customer = {
  _id?: string;
  id?: string;
  name?: string;
  phone?: string;
};

type LedgerRow = {
  _id: string;
  refType?: string;
  refId?: string;
  debit?: number;
  credit?: number;
  notes?: string;
  createdAt?: string;
};

function fmtDateInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getCustId(c: Customer) {
  return c._id || c.id || "";
}

function custLabel(c: Customer) {
  return `${c.name || "Unnamed"}${c.phone ? ` (${c.phone})` : ""}`;
}

const inputCls =
  "w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600";
const btnCls =
  "rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800";
const primaryBtnCls =
  "w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:opacity-95 disabled:opacity-60";
const cardCls = "rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm";

const CustomerLedgerPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");

  // search/autocomplete
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const [from, setFrom] = useState<string>(() =>
    fmtDateInput(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );
  const [to, setTo] = useState<string>(() => fmtDateInput(new Date()));

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [summary, setSummary] = useState<{ debit: number; credit: number; balance: number } | null>(null);

  const [err, setErr] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loading, setLoading] = useState(false);

  // -------- Load customers list ----------
  useEffect(() => {
    (async () => {
      try {
        setLoadingCustomers(true);
        setErr("");

        const res = await api.get("/customers", { params: { limit: 500, page: 1 } });
        const list: Customer[] = Array.isArray(res.data) ? res.data : res.data?.rows || [];
        setCustomers(list);
      } catch (e: any) {
        const msg =
          e?.response?.status === 404
            ? "Customers API not found: add backend route /api/customers."
            : e?.response?.data?.message || "Failed to load customers";
        setErr(msg);
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    })();
  }, []);

  // close autocomplete on outside click
  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(ev.target as any)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const filteredCustomers = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers.slice(0, 50);

    const list = customers.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      return name.includes(s) || phone.includes(s);
    });

    // show top matches (avoid huge list)
    return list.slice(0, 50);
  }, [customers, q]);

  const selectedCustomer = useMemo(() => {
    if (!customerId) return null;
    return customers.find((c) => getCustId(c) === customerId) || null;
  }, [customers, customerId]);

  // -------- Load ledger ----------
  const load = async () => {
    try {
      setErr("");
      setLoading(true);
      setRows([]);
      setSummary(null);

      if (!customerId) {
        setErr("Select customer");
        return;
      }

      const res = await api.get("/sales/ledger", {
        params: { customerId, page: 1, limit: 200, from, to },
      });

      setRows(res.data?.rows || []);
      setSummary(res.data?.summary || null);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!customerId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  const onPickCustomer = (c: Customer) => {
    const id = getCustId(c);
    setCustomerId(id);
    setQ(custLabel(c)); // show selected value in input
    setOpen(false);
  };

  const clearSelection = () => {
    setCustomerId("");
    setQ("");
    setOpen(false);
    setRows([]);
    setSummary(null);
  };

  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6 text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Customer Ledger</h1>
          <div className="text-sm text-slate-400">Search customer by name/phone and view ledger entries.</div>
        </div>

        <button onClick={load} className={btnCls} disabled={loading || !customerId}>
          Refresh
        </button>
      </div>

      {/* Customer Autocomplete */}
      <div className={`${cardCls} mt-4`}>
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-2" ref={boxRef}>
              <label className="text-xs text-slate-300">Customer (type to search)</label>

              <div className="relative mt-1">
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                    // if user starts typing again, treat as new search (not fixed selection)
                    if (customerId) setCustomerId("");
                  }}
                  onFocus={() => setOpen(true)}
                  placeholder={loadingCustomers ? "Loading customers..." : "Start typing… (e.g. Ram / 98xxxx)"}
                  className={inputCls}
                  disabled={loadingCustomers}
                />

                {q && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    Clear
                  </button>
                )}

                {open && !loadingCustomers && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-lg">
                    {filteredCustomers.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-slate-400">No matching customers.</div>
                    ) : (
                      <ul className="max-h-72 overflow-auto">
                        {filteredCustomers.map((c) => {
                          const id = getCustId(c);
                          const active = id && id === customerId;
                          return (
                            <li key={id || custLabel(c)}>
                              <button
                                type="button"
                                onClick={() => onPickCustomer(c)}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-900 ${
                                  active ? "bg-slate-900" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium text-slate-100">{c.name || "Unnamed"}</div>
                                  <div className="text-xs text-slate-400">{c.phone || ""}</div>
                                </div>
                                <div className="text-xs text-slate-500">ID: {id}</div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              {selectedCustomer && (
                <div className="mt-2 text-xs text-slate-400">
                  Selected: <span className="text-slate-200">{custLabel(selectedCustomer)}</span>
                </div>
              )}
            </div>

            {/* Date Filters */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:col-span-1">
              <div>
                <label className="text-xs text-slate-300">From</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">To</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className={`${inputCls} mt-1`}
                />
              </div>
              <div className="col-span-2">
                <button onClick={load} className={primaryBtnCls} disabled={loading || !customerId}>
                  Run
                </button>
              </div>
            </div>
          </div>

          {err && <div className="mt-3 text-rose-400">{err}</div>}
          {loading && <div className="mt-3 text-slate-300">Loading…</div>}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className={`${cardCls} mt-4`}>
          <div className="p-4 md:p-5">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-slate-500">Total Debit</div>
                <div className="text-lg font-semibold">₹{Number(summary.debit || 0).toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-slate-500">Total Credit</div>
                <div className="text-lg font-semibold">₹{Number(summary.credit || 0).toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-xs text-slate-500">Balance (Due)</div>
                <div className="text-lg font-semibold text-orange-300">₹{Number(summary.balance || 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="mt-4 space-y-2">
        {!loading && customerId && rows.length === 0 && (
          <div className={`${cardCls} p-4 text-slate-300`}>No entries for selected range.</div>
        )}

        {rows.map((r) => (
          <div key={r._id} className={cardCls}>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{r.refType || "-"}</div>
                  <div className="mt-1 text-sm text-slate-300 break-words">{r.notes || "-"}</div>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                  <div className="text-xs text-slate-500">Debit</div>
                  <div className="font-semibold">₹{Number(r.debit || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                  <div className="text-xs text-slate-500">Credit</div>
                  <div className="font-semibold">₹{Number(r.credit || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2 col-span-2 md:col-span-2">
                  <div className="text-xs text-slate-500">Ref</div>
                  <div className="text-xs text-slate-300 break-all">
                    {r.refId ? `${r.refType || ""} • ${r.refId}` : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerLedgerPage;
