import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
  quantity: number;
  quantityBase: number;
}

const GRNPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // data
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseId, setWarehouseId] = useState('');

  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');

  // grn lines
  const [lines, setLines] = useState<LineInput[]>([]);

  // search
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);

  // ---- IMPORTANT: KEEP TRANSACTION ID ----
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // ====================================
  // Load warehouses + products
  // ====================================
  useEffect(() => {
    (async () => {
      try {
        const wRes = await api.get('/warehouses');
        setWarehouses(wRes.data);

        const pRes = await api.get('/products');
        setProducts(pRes.data);
      } catch (error) {}
    })();
  }, []);

  // ====================================
  // 🟢 Restore last transaction (if page refresh)
  // ====================================
  useEffect(() => {
    const saved = localStorage.getItem('current_grn_id');
    if (saved) setCreatedId(saved);
  }, []);

  useEffect(() => {
    if (createdId) localStorage.setItem('current_grn_id', createdId);
  }, [createdId]);

  // ====================================
  // Live search
  // ====================================
  const handleSearch = async () => {
    if (!search.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await api.get('/products/search', { params: { q: search.trim() } });
      setResults(res.data);
    } catch {
      setResults([]);
    }
  };

  const addLine = (product: Product) => {
    const ex = lines.find(l => l.productId === product._id);

    if (ex) {
      setLines(prev =>
        prev.map(l =>
          l.productId === product._id
            ? { ...l, quantity: l.quantity + 1, quantityBase: l.quantityBase + 1 }
            : l
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

  const removeLine = (i: number) => setLines(prev => prev.filter((_, x) => x !== i));

  // ====================================
  // CREATE GRN
  // ====================================
  const handleCreate = async () => {
    try {
      setMsg('');
      setErr('');

      if (!warehouseId) return setErr('Select warehouse');
      if (!lines.length) return setErr('Add at least 1 product');

      setLoading(true);

      const res = await api.post('/grn', {
        warehouseId,
        supplierName,
        supplierInvoiceNo: invoiceNo,
        lines
      });

      setCreatedId(res.data._id);
      setMsg('GRN Created. Approve to add stock.');

    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to create GRN');
    } finally {
      setLoading(false);
    }
  };

  // ====================================
  // APPROVE GRN
  // ====================================
  const handleApprove = async () => {
    if (!createdId) return;

    try {
      setErr('');
      setMsg('');
      const res = await api.post(`/grn/${createdId}/approve`);
      setMsg(res.data.message || 'Approved');

      setLines([]);

      // KEEP createdId visible on screen
      // DO NOT CLEAR

    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to approve');
    }
  };

  // ====================================
  // RESET / NEW GRN FLOW
  // ====================================
  const resetPage = () => {
    setCreatedId(null);
    localStorage.removeItem('current_grn_id');
    setLines([]);
    setSupplierName('');
    setInvoiceNo('');
    setMsg('');
    setErr('');
  };

  return (
    <div className="text-slate-100">
      <h1 className="text-2xl font-semibold mb-4">GRN (Goods Received)</h1>

      {/* =================== LEFT PANEL =================== */}
      <div className="p-4 border border-slate-800 rounded-lg bg-slate-950 space-y-4">

        {/* warehouse + supplier */}
        <div className="flex gap-3">
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm flex-1"
          >
            <option value="">Select Warehouse</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          <input
            placeholder="Supplier (optional)"
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm flex-1"
            value={supplierName}
            onChange={e => setSupplierName(e.target.value)}
          />

          <input
            placeholder="Invoice No"
            className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm flex-1"
            value={invoiceNo}
            onChange={e => setInvoiceNo(e.target.value)}
          />
        </div>

        {/* Search */}
        <div>
          <div className="flex gap-2">
            <input
              placeholder="name / sku / alias"
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 text-sm bg-blue-500 text-slate-900 rounded"
            >
              Search
            </button>
          </div>

          {results.length > 0 && (
            <div className="mt-2 bg-slate-900 border border-slate-700 rounded max-h-48 overflow-auto">
              {results.map(p => (
                <div
                  key={p._id}
                  onClick={() => addLine(p)}
                  className="px-3 py-2 border-b border-slate-800 cursor-pointer hover:bg-slate-800 text-sm"
                >
                  {p.name} ({p.sku})
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LINES */}
        <div>
          <h2 className="text-sm font-semibold mb-2">Product Lines</h2>
          {!lines.length ? (
            <p className="opacity-50 text-sm">No lines yet.</p>
          ) : (
            lines.map((line, i) => {
              const p = products.find(x => x._id === line.productId);
              return (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <div className="flex-1 text-sm">
                    {p ? `${p.name} (${p.sku})` : line.productId}
                  </div>

                  <select
                    value={line.packingType}
                    onChange={e => updateLine(i, { packingType: e.target.value as any })}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                  >
                    <option value="LOOSE">LOOSE</option>
                    <option value="KATTA">KATTA</option>
                    <option value="MASTER">MASTER</option>
                    <option value="OTHER">OTHER</option>
                  </select>

                  <input
                    type="number"
                    min={1}
                    className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                    value={line.quantity}
                    onChange={e => updateLine(i, { quantity: +e.target.value })}
                  />

                  <input
                    type="number"
                    min={1}
                    className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
                    value={line.quantityBase}
                    onChange={e => updateLine(i, { quantityBase: +e.target.value })}
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

        {/* BUTTONS */}
        <div className="flex gap-3">
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

        {/* STATUS */}
        {msg && <div className="text-green-400 text-sm">{msg}</div>}
        {err && <div className="text-red-400 text-sm">{err}</div>}

        {/* =================================== */}
        {/* 🔥 PERSISTENT TRANSACTION PANEL      */}
        {/* =================================== */}
        {createdId && (
          <div className="mt-4 p-3 bg-slate-800/40 border border-slate-600 rounded text-sm">
            <div className="font-semibold text-slate-100 mb-1">Transaction ID</div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-slate-900 rounded">
                {createdId}
              </span>

              <button
                className="px-2 py-1 bg-slate-700 rounded text-xs"
                onClick={() => navigator.clipboard.writeText(createdId)}
              >
                Copy
              </button>


              <button
                className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                onClick={resetPage}
              >
                New GRN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GRNPage;
