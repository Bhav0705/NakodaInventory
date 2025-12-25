import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";

type InvoiceRow = {
  _id: string;
  invoiceNo: string;
  status: "DRAFT" | "APPROVED" | "CANCELLED";
  customerId?: any;
  grandTotal?: number;
  paidAmount?: number;
  dueAmount?: number;
  createdAt: string;
};

const STORAGE_KEY = "current_receipt_id";

const ReceiptPage: React.FC = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoiceId, setInvoiceId] = useState("");
  const [mode, setMode] = useState<"CASH" | "UPI" | "BANK" | "CARD" | string>("CASH");
  const [amount, setAmount] = useState<number>(0);
  const [reference, setReference] = useState("");

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // restore draft receipt id
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCreatedId(saved);
  }, []);

  useEffect(() => {
    if (createdId) localStorage.setItem(STORAGE_KEY, createdId);
  }, [createdId]);

  // load recent approved invoices (for payments)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/sales/invoices", { params: { status: "APPROVED", limit: 100, page: 1 } });
        setInvoices(res.data?.rows || []);
      } catch {
        setInvoices([]);
      }
    })();
  }, []);

  const selectedInvoice = useMemo(
    () => invoices.find((x) => x._id === invoiceId),
    [invoices, invoiceId]
  );

  useEffect(() => {
    // auto amount = due
    if (selectedInvoice?.dueAmount != null) setAmount(Number(selectedInvoice.dueAmount || 0));
  }, [selectedInvoice?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async () => {
    try {
      setErr("");
      setMsg("");

      if (!invoiceId) return setErr("Select invoice");
      if (!mode) return setErr("Select payment mode");

      const amt = Number(amount || 0);
      if (amt <= 0) return setErr("Amount must be > 0");

      // safety: block > due in UI also
      const due = Number(selectedInvoice?.dueAmount || 0);
      if (amt > due) return setErr("Amount cannot exceed invoice due");

      setLoading(true);

      const res = await api.post("/sales/receipts", {
        invoiceId,
        amount: amt,
        mode,
        reference: reference || undefined,
      });

      setCreatedId(res.data?.receipt?._id);
      setMsg("Receipt saved. Approve to post payment & ledger.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Create receipt failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!createdId) return;
    try {
      setErr("");
      setMsg("");
      await api.post(`/sales/receipts/${createdId}/approve`);
      localStorage.removeItem(STORAGE_KEY);
      navigate("/sales/receipts");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Approve failed");
    }
  };

  return (
    <div className="p-6 text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">New Receipt (Payment Entry)</h1>
        <button
          onClick={() => navigate("/sales/receipts")}
          className="rounded bg-slate-800 px-4 py-2"
        >
          Back
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div>
            <label className="text-sm text-slate-300">Invoice</label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-3 py-2"
            >
              <option value="">Select approved invoice</option>
              {invoices.map((inv) => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNo} — Due ₹{Number(inv.dueAmount || 0).toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {selectedInvoice && (
            <div className="text-sm text-slate-300">
              <div>
                Total: ₹{Number(selectedInvoice.grandTotal || 0).toFixed(2)} • Paid: ₹
                {Number(selectedInvoice.paidAmount || 0).toFixed(2)} • Due: ₹
                {Number(selectedInvoice.dueAmount || 0).toFixed(2)}
              </div>
              {selectedInvoice.customerId?.name && (
                <div>
                  Customer: {selectedInvoice.customerId.name}
                  {selectedInvoice.customerId.phone ? ` (${selectedInvoice.customerId.phone})` : ""}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm text-slate-300">Payment Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-3 py-2"
              >
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="BANK">BANK</option>
                <option value="CARD">CARD</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-3 py-2"
                placeholder="Enter amount"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Reference (optional)</label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-3 py-2"
                placeholder="UTR / Txn ID / Note"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              disabled={loading}
              onClick={handleCreate}
              className="rounded bg-emerald-600 px-4 py-2 disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save Receipt"}
            </button>

            {createdId && (
              <button
                onClick={handleApprove}
                className="rounded bg-orange-600 px-4 py-2"
              >
                Approve
              </button>
            )}
          </div>

          {msg && <div className="text-emerald-400">{msg}</div>}
          {err && <div className="text-rose-400">{err}</div>}
        </div>
      </div>
    </div>
  );
};

export default ReceiptPage;
