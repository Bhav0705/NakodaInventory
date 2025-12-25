import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";

type InvoiceRow = {
  _id: string;
  invoiceNo: string;
  status: "DRAFT" | "APPROVED" | "CANCELLED";
  warehouseId?: any;
  customerId?: any;
  grandTotal?: number;
  paidAmount?: number;
  dueAmount?: number;
  createdAt: string;
  items?: Array<{
    productId: any;
    quantity: number;
    rate: number;
    discount?: number;
    taxPercent?: number;
  }>;
};

type Product = {
  _id: string;
  name: string;
  sku: string;
};

type Condition = "RESALE" | "DAMAGED";

type ReturnLine = {
  productId: string;
  quantity: number;
  rate: number;
  discount: number;    // ₹
  taxPercent: number;  // %
  condition: Condition;
  reason?: string;
};

const STORAGE_KEY = "current_sales_return_id";

function n2(v: any) {
  const x = Number(v || 0);
  return Number.isFinite(x) ? x : 0;
}

const SalesReturnPage: React.FC = () => {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [invoiceId, setInvoiceId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const [lines, setLines] = useState<ReturnLine[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundMode, setRefundMode] = useState<"CASH" | "UPI" | "BANK" | "CARD" | string>("CASH");
  const [refundRef, setRefundRef] = useState<string>("");

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Restore draft return id
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCreatedId(saved);
  }, []);

  useEffect(() => {
    if (createdId) localStorage.setItem(STORAGE_KEY, createdId);
  }, [createdId]);

  // Load invoices + products
  useEffect(() => {
    (async () => {
      try {
        const invRes = await api.get("/sales/invoices", { params: { status: "APPROVED", limit: 200, page: 1 } });
        setInvoices(invRes.data?.rows || []);
      } catch {
        setInvoices([]);
      }

      try {
        const pRes = await api.get("/products");
        setProducts(pRes.data || []);
      } catch {
        setProducts([]);
      }
    })();
  }, []);

  const selectedInvoice = useMemo(
    () => invoices.find((x) => x._id === invoiceId),
    [invoices, invoiceId]
  );

  // When invoice selected, set warehouseId and prefill lines from invoice items (editable)
  useEffect(() => {
    if (!selectedInvoice) {
      setWarehouseId("");
      setLines([]);
      return;
    }

    const wId =
      typeof selectedInvoice.warehouseId === "string"
        ? selectedInvoice.warehouseId
        : selectedInvoice.warehouseId?._id || selectedInvoice.warehouseId?.id || "";

    setWarehouseId(wId);

    const invItems = selectedInvoice.items || [];
    const mapped: ReturnLine[] = invItems.map((it) => ({
      productId:
        typeof it.productId === "string"
          ? it.productId
          : it.productId?._id || it.productId?.id || "",
      quantity: 0, // start 0; user enters return qty
      rate: n2(it.rate),
      discount: n2(it.discount),
      taxPercent: n2(it.taxPercent),
      condition: "RESALE",
      reason: "",
    }));

    setLines(mapped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInvoice?._id]);

  const updateLine = (i: number, patch: Partial<ReturnLine>) => {
    setLines((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], ...patch };
      return c;
    });
  };

  const addEmptyLine = () => {
    setLines((prev) => [
      ...prev,
      { productId: "", quantity: 1, rate: 0, discount: 0, taxPercent: 0, condition: "RESALE", reason: "" },
    ]);
  };

  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  // Return totals (grand-total style like backend)
  const subTotal = lines.reduce((s, l) => s + n2(l.quantity) * n2(l.rate), 0);
  const discountTotal = lines.reduce((s, l) => s + n2(l.discount), 0);
  const taxableTotal = lines.reduce((s, l) => s + Math.max(0, n2(l.quantity) * n2(l.rate) - n2(l.discount)), 0);
  const taxTotal = lines.reduce(
    (s, l) => s + (Math.max(0, n2(l.quantity) * n2(l.rate) - n2(l.discount)) * n2(l.taxPercent)) / 100,
    0
  );
  const returnTotal = taxableTotal + taxTotal;

  // Default refund amount = returnTotal
  useEffect(() => {
    setRefundAmount(Number(returnTotal.toFixed(2)));
  }, [returnTotal]);

  const handleCreate = async () => {
    try {
      setErr("");
      setMsg("");

      if (!invoiceId) return setErr("Select invoice");
      if (!warehouseId) return setErr("warehouseId missing (invoice warehouse not loaded)");

      const validItems = lines
        .filter((l) => l.productId && n2(l.quantity) > 0)
        .map((l) => ({
          productId: l.productId,
          quantity: n2(l.quantity),
          rate: n2(l.rate),
          discount: n2(l.discount),
          taxPercent: n2(l.taxPercent),
          condition: l.condition,
          reason: l.reason || undefined,
        }));

      if (!validItems.length) return setErr("Add at least 1 return item with quantity > 0");

      if (n2(refundAmount) < 0) return setErr("Refund amount cannot be negative");
      if (n2(refundAmount) > Number(returnTotal.toFixed(2))) return setErr("Refund amount cannot exceed return total");

      setLoading(true);

      const res = await api.post("/sales/returns", {
        invoiceId,
        warehouseId,
        items: validItems,
        refundAmount: n2(refundAmount),
        refundMode: refundMode || undefined,
        refundRef: refundRef || undefined,
      });

      setCreatedId(res.data?.salesReturn?._id);
      setMsg("Return saved. Approve to add stock back + adjust invoice + ledger.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Create return failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!createdId) return;
    try {
      setErr("");
      setMsg("");
      await api.post(`/sales/returns/${createdId}/approve`);
      localStorage.removeItem(STORAGE_KEY);
      navigate("/sales/returns");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Approve failed");
    }
  };

  return (
    <div className="p-6 text-slate-100">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">New Sales Return</h1>
        <button onClick={() => navigate("/sales/returns")} className="rounded bg-slate-800 px-4 py-2">
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

        <div className="rounded border border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Return Items</div>
            <button onClick={addEmptyLine} className="rounded bg-slate-800 px-3 py-2">
              + Add Item
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="hidden md:grid md:grid-cols-8 md:gap-2 text-xs text-slate-400">
              <div className="col-span-2">Product</div>
              <div>Qty</div>
              <div>Rate</div>
              <div>Disc ₹</div>
              <div>GST %</div>
              <div>Cond</div>
              <div>Line Total</div>
            </div>

            {lines.map((l, i) => {
              const prod = products.find((p) => p._id === l.productId);
              const taxable = Math.max(0, n2(l.quantity) * n2(l.rate) - n2(l.discount));
              const tax = (taxable * n2(l.taxPercent)) / 100;
              const lineTotal = taxable + tax;

              return (
                <div key={i} className="grid grid-cols-1 gap-2 rounded border border-slate-800 bg-slate-900 p-3 md:grid-cols-8 md:items-center">
                  <div className="md:col-span-2">
                    <select
                      value={l.productId}
                      onChange={(e) => updateLine(i, { productId: e.target.value })}
                      className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
                    >
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                    {prod && <div className="text-xs text-slate-400 mt-1">{prod.sku}</div>}
                  </div>

                  <input
                    type="number"
                    value={l.quantity}
                    onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                    className="rounded bg-slate-950 border border-slate-700 px-3 py-2"
                    placeholder="Qty"
                  />

                  <input
                    type="number"
                    value={l.rate}
                    onChange={(e) => updateLine(i, { rate: Number(e.target.value) })}
                    className="rounded bg-slate-950 border border-slate-700 px-3 py-2"
                    placeholder="Rate"
                  />

                  <input
                    type="number"
                    value={l.discount}
                    onChange={(e) => updateLine(i, { discount: Number(e.target.value) })}
                    className="rounded bg-slate-950 border border-slate-700 px-3 py-2"
                    placeholder="Discount ₹"
                  />

                  <input
                    type="number"
                    value={l.taxPercent}
                    onChange={(e) => updateLine(i, { taxPercent: Number(e.target.value) })}
                    className="rounded bg-slate-950 border border-slate-700 px-3 py-2"
                    placeholder="GST %"
                  />

                  <select
                    value={l.condition}
                    onChange={(e) => updateLine(i, { condition: e.target.value as Condition })}
                    className="rounded bg-slate-950 border border-slate-700 px-3 py-2"
                  >
                    <option value="RESALE">RESALE</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>

                  <div className="text-right font-semibold">₹{Number(lineTotal || 0).toFixed(2)}</div>

                  <div className="md:col-span-8">
                    <div className="flex gap-2">
                      <input
                        value={l.reason || ""}
                        onChange={(e) => updateLine(i, { reason: e.target.value })}
                        className="w-full rounded bg-slate-950 border border-slate-700 px-3 py-2"
                        placeholder="Reason (optional)"
                      />
                      <button onClick={() => removeLine(i)} className="rounded bg-rose-600 px-3 py-2">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-right space-y-1 text-sm">
            <div>SubTotal: ₹{subTotal.toFixed(2)}</div>
            <div>Discount: ₹{discountTotal.toFixed(2)}</div>
            <div>Taxable: ₹{taxableTotal.toFixed(2)}</div>
            <div>Tax: ₹{taxTotal.toFixed(2)}</div>
            <div className="font-bold text-lg">Return Total: ₹{returnTotal.toFixed(2)}</div>
          </div>
        </div>

        <div className="rounded border border-slate-800 bg-slate-950 p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="text-sm text-slate-300">Refund Mode (optional)</label>
              <select
                value={refundMode}
                onChange={(e) => setRefundMode(e.target.value)}
                className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-3 py-2"
              >
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="BANK">BANK</option>
                <option value="CARD">CARD</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-slate-300">Refund Amount</label>
              <input
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(Number(e.target.value))}
                className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-3 py-2"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Refund Ref (optional)</label>
              <input
                value={refundRef}
                onChange={(e) => setRefundRef(e.target.value)}
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
              {loading ? "Saving..." : "Save Return"}
            </button>

            {createdId && (
              <button onClick={handleApprove} className="rounded bg-orange-600 px-4 py-2">
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

export default SalesReturnPage;
