// src/pages/DispatchPage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getMediaUrl } from "../config/media";

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
  quantity: number; // pieces only
}

const DispatchPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [warehouseId, setWarehouseId] = useState("");
  const [partyName, setPartyName] = useState("");

  const [lines, setLines] = useState<LineInput[]>([]);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<Product[]>([]);

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Media state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadErr, setUploadErr] = useState("");
  const [mediaList, setMediaList] = useState<any[]>([]);

  // ---------- Load warehouses + products ----------
  useEffect(() => {
    async function load() {
      try {
        const [wRes, pRes] = await Promise.all([
          api.get("/warehouses"),
          api.get("/products"),
        ]);

        const ws: Warehouse[] = (wRes.data ?? []).map((wh: any) => ({
          id: wh.id || wh._id,
          name: wh.name,
          code: wh.code,
        }));

        setWarehouses(ws);
        setProducts(pRes.data ?? []);

        // auto-select for manager
        if (user?.warehouses?.length) {
          const firstMatch = ws.find((x) => user.warehouses.includes(x.id));
          if (firstMatch) setWarehouseId(firstMatch.id);
        }
      } catch (e) {
        console.error("Load error", e);
      }
    }
    load();
  }, [user]);

  // ---------- Restore last dispatch id ----------
  useEffect(() => {
    const saved = localStorage.getItem("current_dispatch_id");
    if (saved) setCreatedId(saved);
  }, []);

  // ---------- Persist dispatch id + load media ----------
  useEffect(() => {
    if (createdId) {
      localStorage.setItem("current_dispatch_id", createdId);
      loadMediaForDispatch(createdId);
    }
  }, [createdId]);

  // ---------- Debounced live search ----------
  useEffect(() => {
    const q = search.trim();

    if (!q) {
      setSearchResult([]);
      return;
    }

    if (q.length < 2) {
      setSearchResult([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const res = await api.get("/products/search", { params: { q } });
        setSearchResult(res.data ?? []);
      } catch (e) {
        console.error(e);
        setSearchResult([]);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [search]);

  // ---------- Line helpers ----------
  function addLine(prod: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === prod._id);
      if (existing) {
        return prev.map((l) =>
          l.productId === prod._id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [
        ...prev,
        {
          productId: prod._id,
          quantity: 1,
        },
      ];
    });

    setSearch("");
    setSearchResult([]);
  }

  function updateLine(index: number, patch: Partial<LineInput>) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  // ---------- Create dispatch ----------
  async function handleCreate() {
    setErr("");
    setMsg("");

    if (!warehouseId) return setErr("Select warehouse");
    if (lines.length === 0) return setErr("Add at least one product");

    if (lines.some((l) => !l.quantity || l.quantity <= 0)) {
      return setErr("All quantities must be positive (in pieces)");
    }

    setLoading(true);
    try {
      const res = await api.post("/dispatch", {
        warehouseId,
        partyName,
        dispatchType: "SALE",
        lines,
      });
      setCreatedId(res.data._id);
      setMsg("Dispatch created (DRAFT). Approve to deduct stock.");
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to create dispatch");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Approve dispatch ----------
  async function handleApprove() {
    if (!createdId) return;

    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await api.post(`/dispatch/${createdId}/approve`);
      setMsg(res.data.message || "Approved");
      setLines([]);
      if (warehouseId && createdId) {
        await loadMediaForDispatch(createdId);
      }
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  // ---------- Load media for this dispatch ----------
  async function loadMediaForDispatch(dispatchId: string) {
    if (!dispatchId) return;

    try {
      const res = await api.get("/inventory-media/list", {
        params: {
          transactionType: "DISPATCH",
          transactionId: dispatchId,
        },
      });
      setMediaList(res.data ?? []);
    } catch (e) {
      console.error("Media list error:", e);
    }
  }

  // ---------- Upload media ----------
  async function handleUploadMedia() {
    if (!createdId) return;
    if (!warehouseId) {
      setUploadErr("Select warehouse first");
      return;
    }
    if (!uploadFiles || uploadFiles.length === 0) {
      setUploadErr("Select at least 1 file");
      return;
    }

    try {
      setUploadMsg("");
      setUploadErr("");
      setUploading(true);

      const form = new FormData();
      uploadFiles.forEach((f) => form.append("files", f));
      form.append("transactionType", "DISPATCH");
      form.append("transactionId", createdId);
      form.append("warehouseId", warehouseId);
      form.append("direction", "OUT");

      await api.post("/inventory-media/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadMsg("Uploaded successfully");
      setUploadFiles([]);
      await loadMediaForDispatch(createdId);
    } catch (error: any) {
      setUploadErr(error?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ---------- Reset ----------
  function resetDispatch() {
    setCreatedId(null);
    localStorage.removeItem("current_dispatch_id");
    setLines([]);
    setPartyName("");
    setMsg("");
    setErr("");
    setUploadFiles([]);
    setUploadMsg("");
    setUploadErr("");
    setMediaList([]);
  }

  const safeLines = lines ?? [];
  const safeWarehouses = warehouses ?? [];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 px-3 py-4 text-slate-100 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Dispatch (Goods Out)
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm">
            Create dispatch notes for goods leaving a warehouse. Step 1: create
            dispatch. Step 2: approve to deduct stock. Optional: attach
            proof-of-dispatch photos/videos.
          </p>
        </header>

        <div className="grid items-start gap-4 md:grid-cols-[1.5fr,1fr]">
          {/* Left: main workflow card */}
          <div className="space-y-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/90 via-slate-950/90 to-slate-900/90 p-4 shadow-xl sm:p-5">
            {/* Status strip */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Dispatch status
                </div>
                <div className="text-sm text-slate-100">
                  {createdId ? (
                    <>
                      Dispatch in progress –{" "}
                      <span className="font-semibold text-emerald-400">
                        ID: {createdId.slice(0, 6)}…{createdId.slice(-4)}
                      </span>
                    </>
                  ) : (
                    "Create a new dispatch and then approve to deduct stock."
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
                    onClick={resetDispatch}
                  >
                    New Dispatch
                  </button>
                </div>
              )}
            </div>

            {/* 1. Dispatch details */}
            <section className="space-y-3 border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  1. Dispatch details
                </h2>
                <span className="text-[11px] text-slate-500">
                  Warehouse + party/customer
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
                    {safeWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 space-y-1">
                  <label className="text-xs text-slate-300">
                    Party / Customer name
                  </label>
                  <input
                    placeholder="e.g. XYZ Traders"
                    value={partyName}
                    onChange={(e) => setPartyName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>
            </section>

            {/* 2. Add products (live search) */}
            <section className="space-y-4 border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  2. Add products
                </h2>
                <span className="text-[11px] text-slate-500">
                  Live suggestions by name / SKU / alias
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    placeholder="Search by name / SKU / alias"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>

                {searchResult?.length > 0 && (
                  <div className="max-h-52 overflow-auto rounded-lg border border-slate-800 bg-slate-950 text-sm">
                    {searchResult.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => addLine(p)}
                        className="flex w-full items-start justify-between border-b border-slate-800 px-3 py-2 text-left hover:bg-slate-900"
                      >
                        <span className="text-slate-100">{p.name}</span>
                        <span className="text-[11px] text-slate-400">
                          {p.sku}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lines */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Lines
                  </h3>
                  {safeLines.length > 0 && (
                    <span className="text-[11px] text-slate-500">
                      Total items: {safeLines.length}
                    </span>
                  )}
                </div>

                {safeLines.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    No lines added yet. Start typing above to search and add
                    products.
                  </div>
                ) : (
                  <div className="mt-1 space-y-2">
                    {safeLines.map((line, idx) => {
                      const product = products.find(
                        (p) => p._id === line.productId
                      );
                      return (
                        <div
                          key={line.productId || idx}
                          className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-slate-100">
                              {product
                                ? `${product.name} (${product.sku})`
                                : line.productId}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">
                              Qty (pcs)
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) =>
                                updateLine(idx, {
                                  quantity: Number(e.target.value || 0),
                                })
                              }
                              className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              placeholder="Qty"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="rounded-md border border-rose-500 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* 3. Actions */}
            <section className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Working..." : "Save Dispatch (DRAFT)"}
                </button>

                {createdId && (
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve &amp; Deduct Stock
                  </button>
                )}
              </div>

              {msg && <div className="text-xs text-emerald-400">{msg}</div>}
              {err && <div className="text-xs text-rose-400">{err}</div>}
            </section>

            {/* 4. Media upload + list */}
            {createdId && (
              <section className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950 px-4 py-4 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-100">
                      4. Dispatch media (optional)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Attach images/videos of packed cartons, labels, LR copy,
                      etc.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Transaction:{" "}
                    <span className="font-mono">{createdId}</span>
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    multiple
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const list = e.target.files;
                      if (!list || list.length === 0) return;
                      setUploadFiles(Array.from(list));
                    }}
                    className="block w-full cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-xs file:text-slate-200 hover:border-emerald-400"
                  />

                  <button
                    disabled={
                      !uploadFiles || uploadFiles.length === 0 || uploading
                    }
                    onClick={handleUploadMedia}
                    className="w-full rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {uploading ? "Uploading..." : "Upload"}
                  </button>
                </div>

                {uploadMsg && (
                  <div className="text-xs text-emerald-400">{uploadMsg}</div>
                )}
                {uploadErr && (
                  <div className="text-xs text-rose-400">{uploadErr}</div>
                )}

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-100">
                      Uploaded media
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Total: {mediaList.length}
                    </div>
                  </div>

                  {!mediaList.length ? (
                    <div className="text-xs text-slate-400">
                      No media uploaded yet
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {mediaList.map((m) => {
                        const isVideo = m.fileType === "video";
                        const url =
                          getMediaUrl?.(m.localPath) ||
                          `/inventory-media/${m.localPath}`;

                        return (
                          <div
                            key={m._id}
                            className="rounded-md border border-slate-700 bg-slate-900 p-2"
                          >
                            {isVideo ? (
                              <video
                                controls
                                className="h-32 w-full rounded object-cover"
                              >
                                <source src={url} />
                              </video>
                            ) : (
                              <img
                                src={url}
                                className="h-32 w-full rounded object-cover"
                                alt="media"
                              />
                            )}

                            <div className="mt-1 overflow-hidden text-[10px] text-slate-400">
                              {m.localPath}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Right: instructions / help card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200">
            <strong className="mb-2 block text-slate-100">
              How to use Dispatch:
            </strong>
            <ol className="ml-4 list-decimal space-y-1">
              <li>Select the warehouse from where goods will go out.</li>
              <li>Enter party / customer name for reference.</li>
              <li>Start typing in search to get live product suggestions.</li>
              <li>Click a product to add it as a line.</li>
              <li>
                Update <span className="font-semibold">Qty (pcs)</span> as
                required. All quantities are in pieces.
              </li>
              <li>Click “Save Dispatch (DRAFT)” to create the dispatch.</li>
              <li>
                After verifying lines, click{" "}
                <span className="font-semibold">Approve &amp; Deduct Stock</span>{" "}
                to reduce inventory from that warehouse.
              </li>
              <li>
                Use the media section to upload photos/videos of cartons,
                packing, LR copy, etc. This helps in dispute resolution.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispatchPage;
