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

  useEffect(() => {
    const saved = localStorage.getItem('current_grn_id');
    if (saved) setCreatedId(saved);
  }, []);

  useEffect(() => {
    if (createdId) {
      localStorage.setItem('current_grn_id', createdId);
      // load media whenever we have a GRN id
      loadGRNMedia(createdId);
    }
  }, [createdId]);

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

  const removeLine = (i: number) => setLines((prev) => prev.filter((_, x) => x !== i));

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
      setMsg('GRN Created. Approve to add stock.');
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
      // reload media (if any new)
      loadGRNMedia(createdId);
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to approve');
    }
  };

  // Load media list for this GRN
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
      // console.error('GRN media list error', e);
    }
  };

  // MEDIA UPLOAD FUNCTION
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
    <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-8 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-xl font-semibold sm:text-2xl">GRN (Goods Received)</h1>

        {/* MAIN PANEL */}
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950 px-4 py-4 sm:px-5 sm:py-5">

          {/* Warehouse + Supplier + Invoice */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            >
              <option value="">Select Warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <input
              placeholder="Supplier (optional)"
              className="w-full flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />

            <input
              placeholder="Invoice No"
              className="w-full flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
          </div>

          {/* Search */}
          <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                placeholder="name / sku / alias"
                className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button
                onClick={handleSearch}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-400"
              >
                Search
              </button>
            </div>

            {results.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md border border-slate-700 bg-slate-900 text-sm">
                {results.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => addLine(p)}
                    className="flex w-full items-center justify-between border-b border-slate-800 px-3 py-2 text-left hover:bg-slate-800"
                  >
                    <span>{p.name}</span>
                    <span className="text-xs text-slate-400">{p.sku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lines */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Product Lines</h2>
            {!lines.length ? (
              <p className="text-sm text-slate-400">No lines yet.</p>
            ) : (
              <div className="space-y-2">
                {lines.map((line, i) => {
                  const p = products.find((x) => x._id === line.productId);
                  return (
                    <div
                      key={i}
                      className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm sm:flex-row sm:items-center"
                    >
                      <div className="flex-1">
                        {p ? `${p.name} (${p.sku})` : line.productId}
                      </div>

                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">
                            Qty (pcs)
                          </span>
                          <input
                            type="number"
                            min={1}
                            className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs"
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
                          className="rounded-md border border-orange-500 px-2 py-1 text-xs font-semibold text-orange-400 hover:bg-orange-500/10"
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

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-3">
            <button
              disabled={loading}
              onClick={handleCreate}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              Save GRN
            </button>

            {createdId && (
              <button
                onClick={handleApprove}
                className="rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-orange-400"
              >
                Approve + Update
              </button>
            )}
          </div>

          {msg && <div className="text-sm text-emerald-400">{msg}</div>}
          {err && <div className="text-sm text-rose-400">{err}</div>}

          {/* TRANSACTION PANEL */}
          {createdId && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm">
              <div className="mb-1 font-semibold">Transaction ID</div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-950 px-2 py-1 text-xs font-mono">
                  {createdId}
                </span>

                <button
                  type="button"
                  className="rounded-md bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
                  onClick={() => navigator.clipboard.writeText(createdId)}
                >
                  Copy
                </button>

                <button
                  type="button"
                  className="rounded-md bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-400"
                  onClick={resetPage}
                >
                  New GRN
                </button>
              </div>
            </div>
          )}

          {/* MEDIA UPLOAD PANEL */}
          {createdId && (
            <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-4">
              <h2 className="text-sm font-semibold text-slate-200">
                Upload GRN Media (Images / Videos)
              </h2>

              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="block w-full cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-300"
              />

              <button
                onClick={handleUploadMedia}
                disabled={uploading}
                className="rounded-md bg-blue-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-blue-400 disabled:opacity-60"
              >
                {uploading ? 'Uploading...' : 'Upload Files'}
              </button>

              {uploadMsg && <div className="text-xs text-emerald-400">{uploadMsg}</div>}
              {uploadErr && <div className="text-xs text-rose-400">{uploadErr}</div>}

              {/* MEDIA LIST */}
              {mediaList.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-200">
                    Attached Files
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {mediaList.map((m) => {
                      const isVideo = m.fileType === 'video';
                      const url = `/inventory-media/${m.localPath}`;
                      return (
                        <div
                          key={m._id}
                          className="rounded-md border border-slate-700 bg-slate-900 p-2"
                        >
                          {isVideo ? (
                            <video
                              controls
                              className="h-28 w-full rounded object-cover"
                            >
                              <source src={url} />
                            </video>
                          ) : (
                            <img
                              src={url}
                              alt="media"
                              className="h-28 w-full rounded object-cover"
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GRNPage;
