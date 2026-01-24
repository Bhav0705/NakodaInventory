import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Row = { day: string; mode: string; totalAmount: number; count: number };
type DayTotal = { day: string; total: number; count: number };

const inputCls =
  "w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600";
const btnCls =
  "rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800 disabled:opacity-60";
const primaryBtnCls =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60";
const cardCls = "rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm";

function isoTodayIST() {

  const now = new Date();
  
  return now.toISOString().slice(0, 10);
}

function inr(n: number) {
  const x = Number(n || 0);
  return `₹${x.toFixed(2)}`;
}

const DailySummaryPage: React.FC = () => {
  const today = isoTodayIST();


  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const [rows, setRows] = useState<Row[]>([]);
  const [dayTotals, setDayTotals] = useState<DayTotal[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setErr("");
      setLoading(true);

      const res = await api.get("/sales/reports/collections-daily", {
        params: { from, to },
      });

      setRows(res.data?.rows || []);
      setDayTotals(res.data?.dayTotals || []);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed");
      setRows([]);
      setDayTotals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grand = useMemo(() => dayTotals.reduce((s, x) => s + Number(x.total || 0), 0), [dayTotals]);

  const modeTotals = useMemo(() => {
    const map = new Map<string, { mode: string; total: number; count: number }>();
    for (const r of rows) {
      const key = (r.mode || "UNKNOWN").toUpperCase();
      const cur = map.get(key) || { mode: key, total: 0, count: 0 };
      cur.total += Number(r.totalAmount || 0);
      cur.count += Number(r.count || 0);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [rows]);

  const quickSet = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const toExclusive = new Date(end);
    toExclusive.setDate(end.getDate() + 1); // include today fully
    setFrom(start.toISOString().slice(0, 10));
    setTo(toExclusive.toISOString().slice(0, 10));
  };

  const isEmpty = !loading && !err && dayTotals.length === 0 && rows.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Daily Collections</h1>
          <div className="text-sm text-slate-400">
            Based on <span className="text-slate-300 font-medium">APPROVED</span> receipts (mode-wise + day-wise totals).
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={load} className={btnCls} disabled={loading}>
            Refresh
          </button>
          <button onClick={() => quickSet(1)} className={btnCls} disabled={loading}>
            Today
          </button>
          <button onClick={() => quickSet(7)} className={btnCls} disabled={loading}>
            Last 7 days
          </button>
          <button onClick={() => quickSet(30)} className={btnCls} disabled={loading}>
            Last 30 days
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={`${cardCls} mt-4`}>
        <div className="p-4 md:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-4">
              <label className="text-xs text-slate-300">From (inclusive)</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${inputCls} mt-1`} />
            </div>

            <div className="md:col-span-4">
              <label className="text-xs text-slate-300">
                To (exclusive)
                <span className="ml-2 text-[11px] text-slate-500">
                  Tip: for single day select To = next day
                </span>
              </label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} mt-1`} />
            </div>

            <div className="md:col-span-4">
              <button onClick={load} className={`${primaryBtnCls} w-full`} disabled={loading}>
                Run
              </button>
            </div>
          </div>

          {err && <div className="mt-3 text-rose-400">{err}</div>}
          {loading && <div className="mt-3 text-slate-300">Loading…</div>}
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className={cardCls}>
          <div className="p-4">
            <div className="text-xs text-slate-500">Grand Total</div>
            <div className="mt-1 text-2xl font-semibold">{inr(grand)}</div>
            <div className="mt-1 text-xs text-slate-500">
              Days: <span className="text-slate-300">{dayTotals.length}</span>
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="p-4">
            <div className="text-xs text-slate-500">Total Receipts</div>
            <div className="mt-1 text-2xl font-semibold">
              {dayTotals.reduce((s, d) => s + Number(d.count || 0), 0)}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Modes: <span className="text-slate-300">{modeTotals.length}</span>
            </div>
          </div>
        </div>

        <div className={cardCls}>
          <div className="p-4">
            <div className="text-xs text-slate-500">Top Mode</div>
            <div className="mt-1 text-xl font-semibold">
              {modeTotals[0]?.mode || "-"}
            </div>
            <div className="mt-1 text-sm text-slate-300">
              {modeTotals[0] ? `${inr(modeTotals[0].total)} • ${modeTotals[0].count} receipts` : "-"}
            </div>
          </div>
        </div>
      </div>

      {isEmpty && (
        <div className={`${cardCls} mt-4 p-4 text-slate-300`}>
          No data found for selected range. Check that receipts are <b>APPROVED</b> and date range is correct.
        </div>
      )}

      {/* Content */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
        {/* Day Totals Table */}
        <div className={`md:col-span-7 ${cardCls}`}>
          <div className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Day Totals</div>
              <div className="text-xs text-slate-500">Sorted by date</div>
            </div>

            <div className="mt-3 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-2 pr-2">Day</th>
                    <th className="pb-2 pr-2 text-right">Receipts</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {dayTotals.map((d) => (
                    <tr key={d.day} className="border-t border-slate-800">
                      <td className="py-2 pr-2 text-slate-200">{d.day}</td>
                      <td className="py-2 pr-2 text-right text-slate-300">{d.count}</td>
                      <td className="py-2 text-right font-semibold text-slate-100">{inr(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mode Totals + Details */}
        <div className={`md:col-span-5 ${cardCls}`}>
          <div className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Mode Summary</div>
              <div className="text-xs text-slate-500">Range total</div>
            </div>

            <div className="mt-3 space-y-2">
              {modeTotals.map((m) => (
                <div
                  key={m.mode}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-200">{m.mode}</div>
                    <div className="text-sm font-semibold">{inr(m.total)}</div>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span>Receipts: {m.count}</span>
                    <span>
                      Share:{" "}
                      {grand > 0 ? `${((m.total / grand) * 100).toFixed(1)}%` : "0%"}
                    </span>
                  </div>

                  {/* micro progress bar */}
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-900">
                    <div
                      className="h-2 bg-emerald-600"
                      style={{ width: `${grand > 0 ? Math.min(100, (m.total / grand) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Raw detail list (optional) */}
            {rows.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-slate-500">Mode-wise by day (detail)</div>
                <div className="mt-2 max-h-64 overflow-auto space-y-2">
                  {rows.map((r, idx) => (
                    <div key={`${r.day}-${r.mode}-${idx}`} className="rounded-lg bg-slate-900/40 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-200">
                          {r.day} • <span className="text-slate-400">{r.mode}</span>
                        </div>
                        <div className="text-sm font-semibold">{inr(r.totalAmount)}</div>
                      </div>
                      <div className="text-xs text-slate-400">Count: {r.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailySummaryPage;
