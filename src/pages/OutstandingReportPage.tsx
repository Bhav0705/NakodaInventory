import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { Link } from "react-router-dom";

type Row = {
  customerId: string;
  balance: number;
  lastAt?: string;
  customer?: {
    _id: string;
    name?: string;
    phone?: string;
    gstin?: string;
    status?: string;
  };
};

const inputCls =
  "w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600";
const btnCls =
  "rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800";
const primaryBtnCls =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-95";
const cardCls = "rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm";

function money(n: any) {
  return `₹${Number(n || 0).toFixed(2)}`;
}

function fmtDate(v?: string) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString();
}

export default function OutstandingReportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // UX controls
  const [q, setQ] = useState("");
  const [minDue, setMinDue] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"due_desc" | "due_asc" | "recent">("due_desc");
  const [limit, setLimit] = useState<number>(200);

  const load = async () => {
    try {
      setErr("");
      setLoading(true);
      const res = await api.get("/sales/reports/outstanding", { params: { limit, page: 1 } });
      setRows(res.data?.rows || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = rows.filter((r) => {
      const name = (r.customer?.name || "").toLowerCase();
      const phone = (r.customer?.phone || "").toLowerCase();
      const gstin = (r.customer?.gstin || "").toLowerCase();

      const hit =
        !term ||
        name.includes(term) ||
        phone.includes(term) ||
        gstin.includes(term) ||
        String(r.customerId || "").toLowerCase().includes(term);

      const dueOk = Number(r.balance || 0) >= Number(minDue || 0);
      return hit && dueOk;
    });

    if (sortBy === "due_desc") list = list.sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0));
    if (sortBy === "due_asc") list = list.sort((a, b) => Number(a.balance || 0) - Number(b.balance || 0));
    if (sortBy === "recent") {
      list = list.sort((a, b) => {
        const da = a.lastAt ? new Date(a.lastAt).getTime() : 0;
        const db = b.lastAt ? new Date(b.lastAt).getTime() : 0;
        return db - da;
      });
    }
    return list;
  }, [rows, q, minDue, sortBy]);

  const totalDue = useMemo(() => filtered.reduce((s, r) => s + Number(r.balance || 0), 0), [filtered]);

  const topBuckets = useMemo(() => {
    // Simple "aging-like" buckets by amount (since aging days not available from API)
    const b = { small: 0, mid: 0, big: 0, huge: 0 };
    filtered.forEach((r) => {
      const x = Number(r.balance || 0);
      if (x < 1000) b.small += x;
      else if (x < 10000) b.mid += x;
      else if (x < 50000) b.big += x;
      else b.huge += x;
    });
    return b;
  }, [filtered]);

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Outstanding Report</h1>
          <p className="text-sm text-slate-400">Customer-wise due (Ledger balance = Debit − Credit).</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={load} className={btnCls} type="button">
            Refresh
          </button>
          <button
            onClick={() => {
              const text =
                filtered
                  .map((r) => {
                    const name = r.customer?.name || "Customer";
                    const phone = r.customer?.phone ? ` | ${r.customer.phone}` : "";
                    const gst = r.customer?.gstin ? ` | ${r.customer.gstin}` : "";
                    return `${name}${phone}${gst} | Due: ${Number(r.balance || 0).toFixed(2)} | Last: ${fmtDate(r.lastAt)}`;
                  })
                  .join("\n") || "";
              navigator.clipboard.writeText(text);
            }}
            className={btnCls}
            type="button"
          >
            Copy list
          </button>
        </div>
      </div>

      {err && (
        <div className="mt-4 rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-rose-300">
          {err}
        </div>
      )}

      {/* KPI cards */}
      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className={cardCls}>
          <div className="p-4">
            <div className="text-xs text-slate-400">Customers (filtered)</div>
            <div className="mt-1 text-2xl font-semibold">{filtered.length}</div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="p-4">
            <div className="text-xs text-slate-400">Total Due (filtered)</div>
            <div className="mt-1 text-2xl font-semibold text-orange-300">{money(totalDue)}</div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="p-4">
            <div className="text-xs text-slate-400">Buckets by due amount</div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                <div className="text-xs text-slate-500">&lt; ₹1k</div>
                <div className="font-semibold">{money(topBuckets.small)}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                <div className="text-xs text-slate-500">₹1k–₹10k</div>
                <div className="font-semibold">{money(topBuckets.mid)}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                <div className="text-xs text-slate-500">₹10k–₹50k</div>
                <div className="font-semibold">{money(topBuckets.big)}</div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                <div className="text-xs text-slate-500">&gt; ₹50k</div>
                <div className="font-semibold">{money(topBuckets.huge)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`${cardCls} mt-4`}>
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="text-xs text-slate-400">Search (name / phone / GSTIN)</div>
              <input
                className={inputCls}
                placeholder="Type to filter…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div>
              <div className="text-xs text-slate-400">Min due</div>
              <input
                className={inputCls}
                type="number"
                min={0}
                value={minDue}
                onChange={(e) => setMinDue(Number(e.target.value || 0))}
              />
            </div>

            <div>
              <div className="text-xs text-slate-400">Sort</div>
              <select className={inputCls} value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                <option value="due_desc">Due (High → Low)</option>
                <option value="due_asc">Due (Low → High)</option>
                <option value="recent">Recent activity</option>
              </select>
            </div>

            <div>
              <div className="text-xs text-slate-400">Report limit</div>
              <select className={inputCls} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className={btnCls}
              type="button"
              onClick={() => {
                setQ("");
                setMinDue(0);
                setSortBy("due_desc");
              }}
            >
              Reset filters
            </button>

            <Link to="/sales/receipts/new" className={primaryBtnCls}>
              Add Receipt (Payment)
            </Link>

            <Link to="/sales/reports/ledger" className={btnCls}>
              Open Ledger
            </Link>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mt-4 space-y-3">
        {loading && <div className="text-slate-300">Loading…</div>}
        {!loading && filtered.length === 0 && !err && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-center text-sm text-slate-300">
            No outstanding found for current filters.
          </div>
        )}

        {filtered.map((r, idx) => {
          const name = r.customer?.name || "Customer";
          const phone = r.customer?.phone || "-";
          const gstin = r.customer?.gstin || "";
          const status = r.customer?.status || "";
          const due = Number(r.balance || 0);

          return (
            <div key={`${r.customerId}-${idx}`} className={cardCls}>
              <div className="p-4 md:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold truncate">{name}</div>

                      {status && (
                        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-slate-300">
                          {status}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      Phone: <span className="text-slate-200">{phone}</span>
                      {gstin ? (
                        <>
                          {" "}
                          • GSTIN: <span className="text-slate-200">{gstin}</span>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">Last activity: {fmtDate(r.lastAt)}</div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        to={`/sales/reports/ledger?customerId=${encodeURIComponent(r.customer?._id || r.customerId)}`}
                        className={btnCls}
                      >
                        View Ledger
                      </Link>

                      <Link
                        to="/sales/receipts/new"
                        className={btnCls}
                      >
                        Receive Payment
                      </Link>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-xs text-slate-400">Balance Due</div>
                    <div className="mt-1 text-2xl font-semibold text-orange-300">{money(due)}</div>
                    <div className="mt-1 text-xs text-slate-500">Customer ID: {r.customer?._id || r.customerId}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
