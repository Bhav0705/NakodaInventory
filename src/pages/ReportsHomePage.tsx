import React from "react";
import { useNavigate } from "react-router-dom";

const ReportsHomePage: React.FC = () => {
  const nav = useNavigate();
  return (
    <div className="p-6 text-slate-100">
      <h1 className="text-xl font-semibold">Reports</h1>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <button onClick={() => nav("/sales/reports/outstanding")} className="rounded bg-slate-950 border border-slate-800 p-4 text-left">
          <div className="font-semibold">Outstanding</div>
          <div className="text-sm text-slate-400">Due invoices list + totals</div>
        </button>

        <button onClick={() => nav("/sales/reports/ledger")} className="rounded bg-slate-950 border border-slate-800 p-4 text-left">
          <div className="font-semibold">Customer Ledger</div>
          <div className="text-sm text-slate-400">Invoice/Receipt/Return entries</div>
        </button>

        <button onClick={() => nav("/sales/reports/daily")} className="rounded bg-slate-950 border border-slate-800 p-4 text-left">
          <div className="font-semibold">Daily Summary</div>
          <div className="text-sm text-slate-400">Sales, paid, due by day</div>
        </button>
      </div>
    </div>
  );
};

export default ReportsHomePage;
