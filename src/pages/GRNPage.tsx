// src/pages/GRNPage.tsx
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
  quantity: number; // pieces only
}

const GRNPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseId, setWarehouseId] = useState('');

  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');

  const [lines, setLines] = useState<LineInput[]>([]);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);

  const [createdId, setCreatedId] = useState<string | null>(null);

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  // MEDIA STATE
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadErr, setUploadErr] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaList, setMediaList] = useState<any[]>([]);

  // Load warehouses + products
  useEffect(() => {
    (async () => {
      try {
        const wRes = await api.get('/warehouses');
        setWarehouses(wRes.data);

        const pRes = await api.get('/products');
        setProducts(pRes.data);
      } catch (error) {
        // silent
      }
    })();
  }, []);

  // Restore GRN id from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('current_grn_id');
    if (saved) setCreatedId(saved);
  }, []);

  // Persist GRN id + load media
  useEffect(() => {
    if (createdId) {
      localStorage.setItem('current_grn_id', createdId);
      loadGRNMedia(createdId);
    }
  }, [createdId]);

  // LIVE SEARCH (debounced)
  useEffect(() => {
    const q = search.trim();

    if (!q) {
      setResults([]);
      return;
    }

    // minimum 2 chars to avoid spam
    if (q.length < 2) {
      setResults([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const res = await api.get('/products/search', { params: { q } });
        setResults(res.data ?? []);
      } catch {
        setResults([]);
      }
    }, 300); // 300ms debounce

    return () => window.clearTimeout(handle);
  }, [search]);

  const addLine = (product: Product) => {
    const ex = lines.find((l) => l.productId === product._id);

    if (ex) {
      setLines((prev) =>
        prev.map((l) =>
          l.productId === product._id
            ? { ...l, quantity: l.quantity + 1 }
            : l
        )
      );
    } else {
      setLines((prev) => [
        ...prev,
        {
          productId: product._id,
          quantity: 1,
        },
      ]);
    }

    setSearch('');
    setResults([]);
  };

  const updateLine = (i: number, patch: Partial<LineInput>) => {
    setLines((prev) => {
      const c = [...prev];
      c[i] = { ...c[i], ...patch };
      return c;
    });
  };

  const removeLine = (i: number) =>
    setLines((prev) => prev.filter((_, x) => x !== i));

  const handleCreate = async () => {
    try {
      setMsg('');
      setErr('');

      if (!warehouseId) return setErr('Select warehouse');
      if (!lines.length) return setErr('Add at least 1 product');

      if (lines.some((l) => !l.quantity || l.quantity <= 0)) {
        return setErr('All quantities must be positive (in pieces)');
      }

      setLoading(true);

      const res = await api.post('/grn', {
        warehouseId,
        supplierName,
        supplierInvoiceNo: invoiceNo,
        lines,
      });

      setCreatedId(res.data._id);
      setMsg('GRN created. Approve to add stock.');
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to create GRN');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!createdId) return;

    try {
      setErr('');
      setMsg('');
      const res = await api.post(`/grn/${createdId}/approve`);
      setMsg(res.data.message || 'Approved');
      setLines([]);
      loadGRNMedia(createdId);
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to approve');
    }
  };

  const loadGRNMedia = async (grnId: string) => {
    if (!grnId) return;
    try {
      const res = await api.get('/inventory-media/list', {
        params: {
          transactionType: 'GRN',
          transactionId: grnId,
        },
      });
      setMediaList(res.data ?? []);
    } catch (e) {
      // silent
    }
  };

  const handleUploadMedia = async () => {
    if (!createdId) return;
    if (!warehouseId) {
      setUploadErr('Select warehouse first');
      return;
    }
    if (!files || files.length === 0) {
      setUploadErr('Select at least 1 file');
      return;
    }

    try {
      setUploadErr('');
      setUploadMsg('');
      setUploading(true);

      const fd = new FormData();
      fd.append('transactionId', createdId);
      fd.append('transactionType', 'GRN');
      fd.append('direction', 'IN');
      fd.append('warehouseId', warehouseId);

      Array.from(files).forEach((f) => fd.append('files', f));

      await api.post('/inventory-media/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadMsg('Media uploaded successfully');
      setFiles(null);
      await loadGRNMedia(createdId);
    } catch (error: any) {
      setUploadErr(error?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetPage = () => {
    setCreatedId(null);
    localStorage.removeItem('current_grn_id');
    setLines([]);
    setSupplierName('');
    setInvoiceNo('');
    setMsg('');
    setErr('');
    setFiles(null);
    setUploadErr('');
    setUploadMsg('');
    setMediaList([]);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 px-3 py-4 text-slate-100 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            GRN (Goods Received Note)
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm">
            Capture incoming stock per warehouse. Step 1: create GRN. Step 2:
            approve to update inventory. Optional: attach photos/videos as proof.
          </p>
        </header>

        {/* Main card */}
        <div className="space-y-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/90 via-slate-950/90 to-slate-900/90 p-4 shadow-xl sm:p-5">
          {/* Top status strip */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                GRN status
              </div>
              <div className="text-sm text-slate-100">
                {createdId ? (
                  <>
                    GRN in progress –{' '}
                    <span className="font-semibold text-emerald-400">
                      ID: {createdId.slice(0, 6)}…{createdId.slice(-4)}
                    </span>
                  </>
                ) : (
                  'Create a new GRN and then approve to push stock into inventory.'
                )}
              </div>
            </div>
            {createdId && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700"
                  onClick={() => navigator.clipboard.writeText(createdId)}
                >
                  Copy ID
                </button>
                <button
                  type="button"
                  className="rounded-md border border-rose-500/80 px-3 py-1.5 text-[11px] text-rose-300 hover:bg-rose-500/10"
                  onClick={resetPage}
                >
                  New GRN
                </button>
              </div>
            )}
          </div>

          {/* Section: GRN header details */}
          <section className="space-y-3 border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                1. GRN details
              </h2>
              <span className="text-[11px] text-slate-500">
                Warehouse + supplier + invoice
              </span>
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-300">Warehouse</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.code ? ` (${w.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-300">
                  Supplier (optional)
                </label>
                <input
                  placeholder="e.g. ABC Distributors"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                />
              </div>

              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-300">Supplier Invoice</label>
                <input
                  placeholder="Invoice no."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Section: Search + lines */}
          <section className="space-y-4 border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                2. Add products
              </h2>
              <span className="text-[11px] text-slate-500">
                Live suggestions by name / SKU / alias
              </span>
            </div>

            {/* LIVE Search */}
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  placeholder="Type product name, SKU or alias"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {results.length > 0 && (
                <div className="max-h-52 overflow-auto rounded-lg border border-slate-800 bg-slate-950 text-sm">
                  {results.map((p) => (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => addLine(p)}
                      className="flex w-full items-center justify-between border-b border-slate-800 px-3 py-2 text-left hover:bg-slate-900"
                    >
                      <div className="flex flex-col">
                        <span className="text-slate-100">{p.name}</span>
                        {p.alias && p.alias.length > 0 && (
                          <span className="text-[11px] text-slate-500">
                            Alias: {p.alias.join(', ')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{p.sku}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product lines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Product lines
                </h3>
                {lines.length > 0 && (
                  <span className="text-[11px] text-slate-500">
                    Total items: {lines.length}
                  </span>
                )}
              </div>

              {!lines.length ? (
                <p className="text-sm text-slate-500">
                  No lines yet. Start typing above to search and add products.
                </p>
              ) : (
                <div className="space-y-2">
                  {lines.map((line, i) => {
                    const p = products.find((x) => x._id === line.productId);
                    return (
                      <div
                        key={line.productId || i}
                        className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm sm:flex-row sm:items-center"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-slate-100">
                            {p ? p.name : line.productId}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {p?.sku || 'SKU not found'}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">
                              Qty (pcs)
                            </span>
                            <input
                              type="number"
                              min={1}
                              className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(i, {
                                  quantity: Number(e.target.value || 0),
                                })
                              }
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeLine(i)}
                            className="rounded-md border border-rose-500 px-2 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Section: actions */}
          <section className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <button
                disabled={loading}
                onClick={handleCreate}
                className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Saving…' : 'Save GRN'}
              </button>

              {createdId && (
                <button
                  onClick={handleApprove}
                  className="inline-flex items-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-orange-400"
                >
                  Approve &amp; Update Stock
                </button>
              )}
            </div>

            {msg && <div className="text-sm text-emerald-400">{msg}</div>}
            {err && <div className="text-sm text-rose-400">{err}</div>}
          </section>

          {/* Media upload + list */}
          {createdId && (
            <section className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">
                    3. GRN media (optional)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Attach images/videos of cartons, labels, and condition for
                    audit trail.
                  </p>
                </div>
                <span className="text-[11px] text-slate-500">
                  Transaction: <span className="font-mono">{createdId}</span>
                </span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="block w-full cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-300 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-xs file:text-slate-200 hover:border-emerald-400"
                />

                <button
                  onClick={handleUploadMedia}
                  disabled={uploading}
                  className="w-full rounded-md bg-blue-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {uploading ? 'Uploading…' : 'Upload Files'}
                </button>
              </div>

              {uploadMsg && (
                <div className="text-xs text-emerald-400">{uploadMsg}</div>
              )}
              {uploadErr && (
                <div className="text-xs text-rose-400">{uploadErr}</div>
              )}

              {mediaList.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-200">
                      Attached files
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Total: {mediaList.length}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {mediaList.map((m) => {
                      const isVideo = m.fileType === 'video';
                      const url = `/inventory-media/${m.localPath}`;
                      return (
                        <div
                          key={m._id}
                          className="rounded-lg border border-slate-800 bg-slate-900 p-2"
                        >
                          {isVideo ? (
                            <video
                              controls
                              className="h-28 w-full rounded-md object-cover"
                            >
                              <source src={url} />
                            </video>
                          ) : (
                            <img
                              src={url}
                              alt="media"
                              className="h-28 w-full rounded-md object-cover"
                            />
                          )}
                          <div className="mt-1 truncate text-[10px] text-slate-400">
                            {m.localPath}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default GRNPage;
