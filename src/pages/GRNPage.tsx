import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Warehouse {
  id: string;
  name: string;
  code?: string;
}

interface Product {
  _id: string;
  name: string;
  sku: string;
  alias?: string[];
}

interface LineInput {
  productId: string;
  packingType: 'LOOSE' | 'KATTA' | 'MASTER' | 'OTHER';
  quantity: number;       // user entered qty (e.g., 100 KATTA)
  quantityBase: number;   // converted to base pcs
}

const GRNPage: React.FC = () => {
  const { user } = useAuth();

  // ------------ Data states -------------
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseId, setWarehouseId] = useState('');

  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');

  // ------------ Line states ------------
  const [lines, setLines] = useState<LineInput[]>([]);

  // ------------ Search ------------
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);

  // ------------ Status states ------------
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // ========================================================
  // Load warehouses + products
  // ========================================================
  useEffect(() => {
    (async () => {
      try {
        const wRes = await api.get('/warehouses'); // backend already filtered by user
        setWarehouses(wRes.data);

        const pRes = await api.get('/products');
        setProducts(pRes.data);
      } catch (error) {}
    })();
  }, []);

  // ========================================================
  // 🔍 Live product search
  // ========================================================
  const handleSearch = async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await api.get('/products/search', { params: { q: search.trim() } });
      setResults(res.data);
    } catch (error) {
      setResults([]);
    }
  };

  // ========================================================
  // Add product to lines
  // If same product exists → merge qty
  // ========================================================
  const addLine = (product: Product) => {
    const existing = lines.find(l => l.productId === product._id);

    if (existing) {
      setLines(prev =>
        prev.map(l =>
          l.productId === product._id ? { ...l, quantity: l.quantity + 1, quantityBase: l.quantityBase + 1 } : l
        )
      );
    } else {
      setLines(prev => [
        ...prev,
        { productId: product._id, packingType: 'LOOSE', quantity: 1, quantityBase: 1 }
      ]);
    }

    setSearch('');
    setResults([]);
  };

  const updateLine = (i: number, patch: Partial<LineInput>) => {
    setLines(prev => {
      const c = [...prev];
      c[i] = { ...c[i], ...patch };
      return c;
    });
  };

  const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));

  // ========================================================
  // Save draft GRN
  // ========================================================
  const handleCreate = async () => {
    try {
      setErr('');
      setMsg('');

      if (!warehouseId) {
        setErr('Select warehouse first');
        return;
      }
      if (lines.length === 0) {
        setErr('Add at least 1 product line');
        return;
      }

      setLoading(true);
      const res = await api.post('/grn', {
        warehouseId,
        supplierName,
        supplierInvoiceNo: invoiceNo,
        lines
      });

      setCreatedId(res.data._id);
      setMsg('GRN created. Now approve to add stock.');
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to create GRN');
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // Approve GRN → update stock
  // ========================================================
  const handleApprove = async () => {
    if (!createdId) return;
    try {
      setErr('');
      setMsg('');

      const res = await api.post(`/grn/${createdId}/approve`);
      setMsg(res.data.message || 'Approved');

      // Reset form after success
      setLines([]);
      setCreatedId(null);
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to approve GRN');
    }
  };

  // ========================================================
  // UI
  // ========================================================
  return (
    <div className="text-slate-100">
      <h1 className="text-2xl font-semibold mb-4">GRN (Goods Received)</h1>

      {!user?.warehouses?.length && (
        <p className="text-orange-400 text-sm mb-3">
          This user has no assigned warehouses. Super Admin must assign.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ========== LEFT PANEL ========== */}
        <div className="md:col-span-2 space-y-4 p-4 border border-slate-800 rounded-lg bg-slate-950">

          {/* Warehouse + supplier */}
          <div className="flex gap-3">
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
            >
              <option value="">Select warehouse</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <input
              placeholder="Supplier (optional)"
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />

            <input
              placeholder="Invoice No"
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          {/* Product search */}
          <div>
            <label className="text-sm mb-1 block">Search product</label>
            <div className="flex gap-2">
              <input
                placeholder="name / SKU / alias"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              />
              <button
                onClick={handleSearch}
                className="px-4 py-2 text-sm font-semibold bg-blue-500 text-slate-900 rounded"
              >
                Search
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-2 border border-slate-800 rounded bg-slate-950 max-h-48 overflow-auto">
                {results.map(p => (
                  <div
                    key={p._id}
                    onClick={() => addLine(p)}
                    className="px-3 py-2 border-b border-slate-800 cursor-pointer hover:bg-slate-900 text-sm"
                  >
                    {p.name} ({p.sku})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lines */}
          <div>
            <h2 className="text-sm font-semibold mb-2">Product Lines</h2>

            {lines.length === 0 ? (
              <p className="text-sm opacity-60">No lines added yet.</p>
            ) : (
              lines.map((line, i) => {
                const product = products.find(p => p._id === line.productId);

                return (
                  <div key={i} className="flex gap-3 items-center mb-2">
                    <div className="flex-1 text-sm">
                      {product ? `${product.name} (${product.sku})` : line.productId}
                    </div>

                    <select
                      value={line.packingType}
                      onChange={(e) => updateLine(i, { packingType: e.target.value as any })}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs"
                    >
                      <option value="LOOSE">LOOSE</option>
                      <option value="KATTA">KATTA</option>
                      <option value="MASTER">MASTER</option>
                      <option value="OTHER">OTHER</option>
                    </select>

                    <input
                      type="number"
                      min={1}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs"
                      value={line.quantity}
                      onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                    />

                    <input
                      type="number"
                      min={1}
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-2 text-xs"
                      title="Base units (pcs)"
                      value={line.quantityBase}
                      onChange={(e) => updateLine(i, { quantityBase: Number(e.target.value) })}
                    />

                    <button
                      onClick={() => removeLine(i)}
                      className="px-2 py-1 border border-orange-500 text-orange-400 rounded text-xs"
                    >
                      X
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              disabled={loading}
              onClick={handleCreate}
              className="bg-green-500 text-slate-900 px-4 py-2 rounded text-sm font-semibold"
            >
              Save GRN
            </button>

            {createdId && (
              <button
                onClick={handleApprove}
                className="bg-orange-500 text-slate-900 px-4 py-2 rounded text-sm font-semibold"
              >
                Approve + Update
              </button>
            )}
          </div>

          {msg && <div className="text-green-400 text-sm mt-2">{msg}</div>}
          {err && <div className="text-red-400 text-sm mt-2">{err}</div>}
        </div>

        {/* RIGHT PANEL */}
        <div className="p-4 border border-slate-800 rounded-lg bg-slate-950 text-sm leading-6">
          <h2 className="font-semibold mb-2">How it works</h2>
          <ol className="list-decimal pl-5">
            <li>Select warehouse.</li>
            <li>Search & add product.</li>
            <li>Set qty & base qty (pcs).</li>
            <li>Save GRN → Draft.</li>
            <li>Approve → Increase Stock.</li>
          </ol>
          <p className="mt-3 opacity-70 text-xs">
            All qty in <strong>quantityBase</strong> = actual pieces going into stock.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GRNPage;
