import React, { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Warehouse {
  id: string;
  name: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface Customer {
  _id: string;
  name: string;
  phone?: string;
}

interface LineInput {
  productId: string;
  quantity: number;
  rate: number;
  discount: number; // ₹
  taxPercent: number; // %
}

const STORAGE_KEY = "current_sales_invoice_id";

const inputCls =
  "w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600";
const labelCls = "text-xs text-slate-400";
const cardCls = "rounded-2xl border border-slate-800 bg-slate-950/60 shadow-sm";

const normalizePhone = (v: string) => String(v || "").replace(/\D/g, "").slice(0, 10);

export default function SalesInvoicePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseId, setWarehouseId] = useState("");

  // Customer (Option B)
  const [customerMode, setCustomerMode] = useState<"WALK_IN" | "REGISTERED">("WALK_IN");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerLoadErr, setCustomerLoadErr] = useState("");

  const [lines, setLines] = useState<LineInput[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Product[]>([]);

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Load warehouses + products
  useEffect(() => {
    (async () => {
      const wRes = await api.get("/warehouses");
      const all: Warehouse[] = wRes.data || [];

      const allowed =
        user?.role === "super_admin"
          ? all
          : all.filter((w) => (user?.warehouses || []).includes(w.id));

      setWarehouses(allowed);
      if (allowed.length === 1) setWarehouseId(allowed[0].id);

      const pRes = await api.get("/products");
      setProducts(pRes.data || []);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Load customers (if endpoint exists). If 404, UI still works with WALK_IN mode.
  useEffect(() => {
    (async () => {
      try {
        setCustomerLoadErr("");
        const res = await api.get("/customers", { params: { limit: 500, page: 1 } });
        const list = (res.data?.rows || res.data || []) as Customer[];
        setCustomers(list);
      } catch (e: any) {
        const m = e?.response?.status === 404 ? "Customers API missing (/api/customers)." : "Failed to load customers.";
        setCustomerLoadErr(m);
        setCustomers([]);
      }
    })();
  }, []);

  // Restore invoice id
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCreatedId(saved);
  }, []);

  useEffect(() => {
    if (createdId) localStorage.setItem(STORAGE_KEY, createdId);
  }, [createdId]);

  // Product search
  useEffect(() => {
    if (search.trim().length < 2) return setResults([]);
    const t = setTimeout(async () => {
      const res = await api.get("/products/search", { params: { q: search } });
      setResults(res.data || []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  const addLine = (p: Product) => {
    const ex = lines.find((l) => l.productId === p._id);
    if (ex) {
      setLines((prev) =>
        prev.map((l) => (l.productId === p._id ? { ...l, quantity: l.quantity + 1 } : l))
      );
    } else {
      setLines((prev) => [
        ...prev,
        { productId: p._id, quantity: 1, rate: 0, discount: 0, taxPercent: 0 },
      ]);
    }
    setSearch("");
    setResults([]);
  };

  const updateLine = (i: number, patch: Partial<LineInput>) => {
    setLines((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], ...patch };
      return c;
    });
  };

  const removeLine = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  // ===== Calculations (memo) =====
  const totals = useMemo(() => {
    const subTotal = lines.reduce((s, l) => s + l.quantity * l.rate, 0);
    const discountTotal = lines.reduce((s, l) => s + l.discount, 0);
    const taxableTotal = lines.reduce((s, l) => s + Math.max(0, l.quantity * l.rate - l.discount), 0);
    const taxTotal = lines.reduce((s, l) => {
      const taxable = Math.max(0, l.quantity * l.rate - l.discount);
      return s + (taxable * l.taxPercent) / 100;
    }, 0);
    const grandTotal = taxableTotal + taxTotal;

    return { subTotal, discountTotal, taxableTotal, taxTotal, grandTotal };
  }, [lines]);

  const validateCustomer = () => {
    if (customerMode === "REGISTERED") {
      if (!customerId) return "Select customer";
      return "";
    }

    // WALK_IN
    const n = customerName.trim();
    const p = normalizePhone(customerPhone);
    if (!n) return "Customer name is required";
    if (!/^\d{10}$/.test(p)) return "Valid 10-digit phone required";
    return "";
  };

  const handleCreate = async () => {
    try {
      setErr("");
      setMsg("");

      if (!warehouseId) return setErr("Select warehouse");
      if (!lines.length) return setErr("Add products");

      const cErr = validateCustomer();
      if (cErr) return setErr(cErr);

      setLoading(true);

      const payload: any = {
        warehouseId,
        items: lines,
        paidAmount: 0,
      };

      if (customerMode === "REGISTERED") {
        payload.customerId = customerId;
      } else {
        payload.customer = {
type: ["WALK_IN", "Online"],
          name: customerName.trim(),
          phone: normalizePhone(customerPhone),
        };
      }

      const res = await api.post("/sales/invoices", payload);

      setCreatedId(res.data.invoice._id);
      setMsg("Invoice saved. Approve to deduct stock.");
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!createdId) return;
    await api.post(`/sales/invoices/${createdId}/approve`);
    localStorage.removeItem(STORAGE_KEY);
    navigate("/sales/invoices");
  };

  const clearDraft = () => {
    setLines([]);
    setSearch("");
    setResults([]);
    setCreatedId(null);
    localStorage.removeItem(STORAGE_KEY);
    setMsg("");
    setErr("");
  };

  return (
    <div className="mx-auto w-full max-w-6xl p-4 md:p-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">New Sales Entry</h1>
          <p className="text-sm text-slate-400">Draft → Save → Approve (stock will deduct on approve)</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={clearDraft}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm hover:bg-slate-800"
            type="button"
          >
            Clear
          </button>

          <button
            onClick={handleCreate}
            disabled={loading}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            type="button"
          >
            {loading ? "Saving..." : "Save Draft"}
          </button>

          {createdId && (
            <button
              onClick={handleApprove}
              className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white"
              type="button"
            >
              Approve & Deduct Stock
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(msg || err || customerLoadErr) && (
        <div className="mt-4 space-y-2">
          {msg && (
            <div className="rounded-xl border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-emerald-300">
              {msg}
            </div>
          )}
          {err && (
            <div className="rounded-xl border border-rose-800 bg-rose-950/40 px-4 py-3 text-rose-300">
              {err}
            </div>
          )}
          {customerLoadErr && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-slate-300">
              {customerLoadErr} You can still use Walk-in.
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Entry */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer */}
          <div className={cardCls}>
            <div className="p-4 md:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Customer</div>
                  <div className="text-xs text-slate-400">Walk-in (auto-create) or select registered</div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCustomerMode("WALK_IN")}
                    className={`rounded-lg px-3 py-2 text-sm border ${
                      customerMode === "WALK_IN"
                        ? "border-slate-600 bg-slate-800"
                        : "border-slate-800 bg-slate-950/40 hover:bg-slate-900"
                    }`}
                  >
                    Walk-in
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode("REGISTERED")}
                    className={`rounded-lg px-3 py-2 text-sm border ${
                      customerMode === "REGISTERED"
                        ? "border-slate-600 bg-slate-800"
                        : "border-slate-800 bg-slate-950/40 hover:bg-slate-900"
                    }`}
                  >
                    Registered
                  </button>
                </div>
              </div>

              {customerMode === "WALK_IN" ? (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <div className={labelCls}>Customer name</div>
                    <input
                      className={inputCls}
                      placeholder="e.g., Rahul"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className={labelCls}>Phone (10-digit)</div>
                    <input
                      className={inputCls}
                      placeholder="e.g., 9876543210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(normalizePhone(e.target.value))}
                      inputMode="numeric"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <div className={labelCls}>Select customer</div>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}{c.phone ? ` (${c.phone})` : ""}
                      </option>
                    ))}
                  </select>

                  {customers.length === 0 && (
                    <div className="mt-2 text-xs text-slate-400">
                      No customers loaded. Use Walk-in or add Customers API.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Warehouse + Search */}
          <div className={cardCls}>
            <div className="p-4 md:p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className={labelCls}>Warehouse</div>
                  <select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className={inputCls}>
                    <option value="">Select warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={labelCls}>Search product</div>
                  <input
                    className={inputCls}
                    placeholder="Type name / SKU (min 2 chars)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              {results.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                  {results.slice(0, 8).map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => addLine(p)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-900"
                    >
                      <div className="font-medium text-slate-100">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.sku}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items table */}
          <div className={cardCls}>
            <div className="border-b border-slate-800 px-4 py-3 md:px-5">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Items</div>
                <div className="text-xs text-slate-400">
                  {lines.length} line{lines.length === 1 ? "" : "s"}
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5">
              {lines.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center text-sm text-slate-400">
                  Search and click a product to add it here.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="hidden grid-cols-12 gap-2 text-xs text-slate-400 md:grid">
                    <div className="col-span-4">Product</div>
                    <div className="col-span-2">Qty</div>
                    <div className="col-span-2">Rate</div>
                    <div className="col-span-2">Discount (₹)</div>
                    <div className="col-span-1">GST %</div>
                    <div className="col-span-1 text-right">Total</div>
                  </div>

                  {lines.map((l, i) => {
                    const p = products.find((x) => x._id === l.productId);
                    const taxable = Math.max(0, l.quantity * l.rate - l.discount);
                    const tax = (taxable * l.taxPercent) / 100;
                    const lineTotal = taxable + tax;

                    return (
                      <div
                        key={l.productId}
                        className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3 md:grid-cols-12 md:items-center"
                      >
                        <div className="md:col-span-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-medium leading-5">{p?.name || "—"}</div>
                              <div className="text-xs text-slate-500">{p?.sku || ""}</div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <div className="md:hidden mb-1 text-xs text-slate-400">Qty</div>
                          <input
                            className={inputCls}
                            type="number"
                            min={1}
                            value={l.quantity}
                            onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value || 1)) })}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <div className="md:hidden mb-1 text-xs text-slate-400">Rate</div>
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            value={l.rate}
                            onChange={(e) => updateLine(i, { rate: Math.max(0, Number(e.target.value || 0)) })}
                          />
                        </div>

                        <div className="md:col-span-2">
                          <div className="md:hidden mb-1 text-xs text-slate-400">Discount (₹)</div>
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            value={l.discount}
                            onChange={(e) => updateLine(i, { discount: Math.max(0, Number(e.target.value || 0)) })}
                          />
                        </div>

                        <div className="md:col-span-1">
                          <div className="md:hidden mb-1 text-xs text-slate-400">GST %</div>
                          <input
                            className={inputCls}
                            type="number"
                            min={0}
                            value={l.taxPercent}
                            onChange={(e) => updateLine(i, { taxPercent: Math.max(0, Number(e.target.value || 0)) })}
                          />
                        </div>

                        <div className="md:col-span-1 md:text-right">
                          <div className="md:hidden mb-1 text-xs text-slate-400">Line Total</div>
                          <div className="font-semibold">₹{lineTotal.toFixed(2)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Totals sticky card */}
        <div className="lg:col-span-1">
          <div className={`${cardCls} lg:sticky lg:top-6`}>
            <div className="border-b border-slate-800 px-4 py-3 md:px-5">
              <div className="font-semibold">Totals</div>
            </div>

            <div className="p-4 md:p-5 space-y-2 text-sm">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-300">
                <div className="text-slate-400 mb-1">Customer</div>
                {customerMode === "REGISTERED" ? (
                  <div>
                    Mode: Registered
                    <div className="text-slate-400">
                      {customerId ? "Selected" : "Not selected"}
                    </div>
                  </div>
                ) : (
                  <div>
                    Mode: Walk-in
                    <div className="text-slate-400">
                      {customerName ? customerName : "Name missing"} •{" "}
                      {normalizePhone(customerPhone) ? normalizePhone(customerPhone) : "Phone missing"}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">SubTotal</span>
                <span>₹{totals.subTotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Discount</span>
                <span>₹{totals.discountTotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Taxable</span>
                <span>₹{totals.taxableTotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tax</span>
                <span>₹{totals.taxTotal.toFixed(2)}</span>
              </div>

              <div className="my-3 h-px bg-slate-800" />

              <div className="flex items-center justify-between text-base font-semibold">
                <span>Grand Total</span>
                <span>₹{totals.grandTotal.toFixed(2)}</span>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Save Draft first. Approve only when final (stock will reduce).
              </div>

              {createdId && (
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-300">
                  Draft ID saved. You can refresh the page safely.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
