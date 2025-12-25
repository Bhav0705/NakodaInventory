import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";

type Status = "DRAFT" | "APPROVED" | "CANCELLED";

type ReturnRow = {
  _id: string;
  returnNo: string;
  status: Status;
  subtotal: number; // in our backend this is RETURN GRAND TOTAL
  refundAmount?: number;
  refundMode?: string;
  refundRef?: string;
  createdAt: string;
  invoiceId?: any;
  warehouseId?: any;
};

const SalesReturnsListPage: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [status, setStatus] = useState<"" | Status>("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setErr("");

      const res = await api.get("/sales/returns", {
        params: { page, limit, status: status || undefined },
      });

      setRows(res.data?.rows || []);
      setTotal(res.data?.total || 0);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to load returns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const approve = async (id: string) => {
    try {
      await api.post(`/sales/returns/${id}/approve`);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Approve failed");
    }
  };

  return (
    <div className="p-6 text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Sales Returns</h1>
        <button
          onClick={() => navigate("/sales/returns/new")}
          className="rounded bg-emerald-600 px-4 py-2"
        >
          + New Return
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as any);
          }}
          className="rounded bg-slate-900 border border-slate-700 px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="DRAFT">DRAFT</option>
          <option value="APPROVED">APPROVED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        <button onClick={load} className="rounded bg-slate-800 px-4 py-2">
          Refresh
        </button>
      </div>

      {err && <div className="mt-3 text-rose-400">{err}</div>}

      <div className="mt-4 space-y-3">
        {loading && <div className="text-slate-300">Loading...</div>}

        {!loading && rows.length === 0 && (
          <div className="text-slate-300">No returns found.</div>
        )}

        {rows.map((r) => (
          <div key={r._id} className="rounded border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">{r.returnNo}</div>
                <div className="text-sm text-slate-400">
                  {new Date(r.createdAt).toLocaleString()}
                  {r.invoiceId?.invoiceNo ? ` • ${r.invoiceId.invoiceNo}` : ""}
                  {r.warehouseId?.name ? ` • ${r.warehouseId.name}` : ""}
                </div>

                <div className="text-sm text-slate-300">
                  Return Total: ₹{Number(r.subtotal || 0).toFixed(2)}
                  {r.refundAmount != null ? ` • Refund: ₹${Number(r.refundAmount || 0).toFixed(2)}` : ""}
                  {r.refundMode ? ` • ${r.refundMode}` : ""}
                  {r.refundRef ? ` • Ref: ${r.refundRef}` : ""}
                </div>
              </div>

              <div className="text-right">
                <div className="mt-1 text-sm">
                  Status:{" "}
                  <span
                    className={
                      r.status === "APPROVED"
                        ? "text-emerald-400"
                        : r.status === "CANCELLED"
                        ? "text-rose-400"
                        : "text-orange-400"
                    }
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === "DRAFT" && (
                <button onClick={() => approve(r._id)} className="rounded bg-orange-600 px-4 py-2">
                  Approve
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded bg-slate-800 px-4 py-2 disabled:opacity-60"
        >
          Prev
        </button>

        <div className="text-slate-300">
          Page {page} / {totalPages} (Total: {total})
        </div>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="rounded bg-slate-800 px-4 py-2 disabled:opacity-60"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SalesReturnsListPage;
