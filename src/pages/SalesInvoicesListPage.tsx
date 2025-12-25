import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

type Status = 'DRAFT' | 'APPROVED' | 'CANCELLED';

interface InvoiceRow {
  _id: string;
  invoiceNo: string;
  status: Status;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  createdAt: string;
  warehouseId?: { name?: string };
  customerId?: { name?: string; phone?: string };
}

const SalesInvoicesListPage: React.FC = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [status, setStatus] = useState<'' | Status>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setErr('');

      const res = await api.get('/sales/invoices', {
        params: { page, limit, status: status || undefined },
      });

      setRows(res.data.rows || []);
      setTotal(res.data.total || 0);
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Failed to load invoices');
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
      await api.post(`/sales/invoices/${id}/approve`);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Approve failed');
    }
  };

  const cancel = async (id: string) => {
    try {
      await api.post(`/sales/invoices/${id}/cancel`);
      load();
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Cancel failed');
    }
  };

  return (
    <div className="p-6 text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Sales Invoices</h1>
        <button
          onClick={() => navigate('/sales/new')}
          className="rounded bg-emerald-600 px-4 py-2"
        >
          + New Invoice
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

        <button
          onClick={load}
          className="rounded bg-slate-800 px-4 py-2"
        >
          Refresh
        </button>
      </div>

      {err && <div className="mt-3 text-rose-400">{err}</div>}

      <div className="mt-4 space-y-3">
        {loading && <div className="text-slate-300">Loading...</div>}

        {!loading && rows.length === 0 && (
          <div className="text-slate-300">No invoices found.</div>
        )}

        {rows.map((r) => (
          <div key={r._id} className="rounded border border-slate-800 bg-slate-950 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">{r.invoiceNo}</div>
                <div className="text-sm text-slate-400">
                  {new Date(r.createdAt).toLocaleString()}
                  {r.warehouseId?.name ? ` • ${r.warehouseId.name}` : ''}
                </div>
                {r.customerId?.name && (
                  <div className="text-sm text-slate-300">
                    Customer: {r.customerId.name} {r.customerId.phone ? `(${r.customerId.phone})` : ''}
                  </div>
                )}
              </div>

              <div className="text-right">
<div className="font-semibold">₹{Number(r.grandTotal || 0).toFixed(2)}</div>
                <div className="text-sm text-slate-400">
                  Paid: ₹{Number(r.paidAmount || 0).toFixed(2)} • Due: ₹{Number(r.dueAmount || 0).toFixed(2)}
                </div>
                <div className="mt-1 text-sm">
                  Status:{' '}
                  <span
                    className={
                      r.status === 'APPROVED'
                        ? 'text-emerald-400'
                        : r.status === 'CANCELLED'
                        ? 'text-rose-400'
                        : 'text-orange-400'
                    }
                  >
                    {r.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === 'DRAFT' && (
                <button
                  onClick={() => approve(r._id)}
                  className="rounded bg-orange-600 px-4 py-2"
                >
                  Approve
                </button>
              )}

              {r.status === 'APPROVED' && (
                <button
                  onClick={() => cancel(r._id)}
                  className="rounded bg-rose-600 px-4 py-2"
                >
                  Cancel
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

export default SalesInvoicesListPage;
