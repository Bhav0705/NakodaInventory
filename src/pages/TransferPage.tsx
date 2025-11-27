// src/pages/TransferPage.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
}

interface LineInput {
  productId: string;
  packingType: 'LOOSE' | 'KATTA' | 'MASTER' | 'OTHER';
  quantity: number;
  quantityBase: number;
}

const TransferPage: React.FC = () => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [remarks, setRemarks] = useState('');

  const [lines, setLines] = useState<LineInput[]>([]);
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<Product[]>([]);

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [wRes, pRes] = await Promise.all([
          api.get('/warehouses'),
          api.get('/products'),
        ]);

        const w: Warehouse[] = (wRes.data ?? []).map((wh: any) => ({
          id: wh.id || wh._id || wh.code, // normalize id so it is always defined
          name: wh.name,
          code: wh.code,
        }));

        setWarehouses(w);
        setProducts(pRes.data ?? []);

        // auto-select from warehouse based on user access
        if (user?.warehouses?.length) {
          const first = w.find((wh: Warehouse) =>
            user.warehouses.includes(wh.id)
          );
          if (first) setFromWarehouseId(first.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [user]);

  const handleSearch = async () => {
    if (!search.trim()) {
      setResult([]);
      return;
    }
    try {
      const res = await api.get('/products/search', { params: { q: search } });
      setResult(res.data ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  const addLine = (product: Product) => {
    setLines((prev) => [
      ...prev,
      {
        productId: product._id,
        packingType: 'LOOSE',
        quantity: 1,
        quantityBase: 1,
      },
    ]);
    setResult([]);
    setSearch('');
  };

  const updateLine = (index: number, patch: Partial<LineInput>) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    setErr('');
    setMsg('');
    setCreatedId(null);

    if (!fromWarehouseId || !toWarehouseId) {
      setErr('Select both From and To warehouses');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setErr('From and To warehouse cannot be same');
      return;
    }
    if (lines.length === 0) {
      setErr('Add at least one line');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/transfer', {
        fromWarehouseId,
        toWarehouseId,
        remarks,
        lines,
      });
      setCreatedId(res.data._id);
      setMsg('Transfer created (DRAFT). Approve to move stock.');
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to create transfer');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!createdId) return;
    setLoading(true);
    setErr('');
    setMsg('');
    try {
      const res = await api.post(`/transfer/${createdId}/approve`);
      setMsg(res.data.message || 'Transfer approved');
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to approve transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-100">
        Warehouse Transfer (WH → WH)
      </h1>

      {(!user?.warehouses || user.warehouses.length === 0) && (
        <p className="mb-3 text-xs text-orange-400">
          This user has no assigned warehouses. Ask super admin to assign.
        </p>
      )}

      <div className="grid items-start gap-4 md:grid-cols-[1.4fr,1fr]">
        {/* Left: main transfer form */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">
          <div className="mb-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                From Warehouse (stock yahan se niklega)
              </label>
              <select
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">
                To Warehouse (stock yahan jayega)
              </label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs text-slate-300">
              Remarks (optional)
            </label>
            <input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. shift Apple chargers from Delhi to Bhiwandi"
            />
          </div>

          {/* Product search */}
          <div className="mb-3">
            <div className="mb-1 text-xs text-slate-300">Add product</div>
            <div className="flex gap-2">
              <input
                placeholder="Search by name/SKU/alias"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-blue-400"
              >
                Search
              </button>
            </div>
            {result.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-950 text-xs">
                {result.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => addLine(p)}
                    className="flex w-full items-start justify-between border-b border-slate-800 px-3 py-2 text-left hover:bg-slate-900"
                  >
                    <span>{p.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {p.sku}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lines */}
          <div>
            <div className="mb-1 text-sm font-medium text-slate-200">Lines</div>
            {lines.length === 0 && (
              <div className="text-xs text-slate-400">
                No lines added. Search and select a product to add.
              </div>
            )}
            <div className="mt-2 space-y-2">
              {lines.map((line, idx) => {
                const product = products.find((p) => p._id === line.productId);
                return (
                  <div
                    key={`${line.productId}-${idx}`}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {product ? product.name : line.productId}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {product?.sku}
                      </div>
                    </div>
                    <select
                      value={line.packingType}
                      onChange={(e) =>
                        updateLine(idx, {
                          packingType:
                            e.target.value as LineInput['packingType'],
                        })
                      }
                      className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="LOOSE">Loose</option>
                      <option value="KATTA">Katta</option>
                      <option value="MASTER">Master</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(idx, {
                          quantity: Number(e.target.value || 0),
                        })
                      }
                      className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      placeholder="Qty"
                    />
                    <input
                      type="number"
                      min={1}
                      value={line.quantityBase}
                      onChange={(e) =>
                        updateLine(idx, {
                          quantityBase: Number(e.target.value || 0),
                        })
                      }
                      className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      placeholder="Qty (pcs)"
                      title="Total pieces after conversion"
                    />
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="rounded-md border border-red-500 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Working...' : 'Save Transfer (DRAFT)'}
            </button>
            {createdId && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={loading}
                className="rounded-md bg-orange-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Approve + Move Stock
              </button>
            )}
          </div>

          {msg && <div className="mt-2 text-xs text-emerald-400">{msg}</div>}
          {err && <div className="mt-2 text-xs text-orange-400">{err}</div>}
        </div>

        {/* Right: help/explanation */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200">
          <div className="mb-2 font-semibold text-slate-100">
            How Warehouse Transfer Works
          </div>
          <ol className="ml-4 list-decimal space-y-1 text-[11px] text-slate-300">
            <li>Select <b>From</b> warehouse (source godown).</li>
            <li>Select <b>To</b> warehouse (destination godown).</li>
            <li>Search product (name / SKU / alias) and add lines.</li>
            <li>
              <b>Quantity</b> = Katta/Master count,&nbsp;
              <b>Qty (pcs)</b> = total pieces going out (base unit).
            </li>
            <li>Click <b>Save Transfer</b> → entry will be DRAFT.</li>
            <li>
              Then click <b>Approve + Move Stock</b>:
              <ul className="ml-4 list-disc">
                <li>Source warehouse stock will decrease (OUT movement).</li>
                <li>Destination warehouse stock will increase (IN movement).</li>
                <li>Stock ledger will show TRANSFER IN/OUT in both warehouses.</li>
              </ul>
            </li>
          </ol>
          <p className="mt-3 text-[11px] text-slate-400">
            If there is not enough stock in source warehouse, approval will be
            blocked with an error (no negative stock).
          </p>
        </div>
      </div>
    </div>
  );
};

export default TransferPage;
