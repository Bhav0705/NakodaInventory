// src/pages/TransferPage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

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
  quantity: number;
}

const TransferPage: React.FC = () => {
  const { user } = useAuth();

  // warehouses are now split into from / to
  const [warehouses, setWarehouses] = useState<{
    from: Warehouse[];
    to: Warehouse[];
  }>({
    from: [],
    to: [],
  });

  const [products, setProducts] = useState<Product[]>([]);

  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [remarks, setRemarks] = useState("");

  const [lines, setLines] = useState<LineInput[]>([]);
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<Product[]>([]);

  const [createdId, setCreatedId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // MEDIA
  const [files, setFiles] = useState<File[]>([]);
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadErr, setUploadErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [mediaList, setMediaList] = useState<any[]>([]);

  // ------------------ LOAD DATA ------------------
  useEffect(() => {
    async function load() {
      try {
        const [twRes, pRes] = await Promise.all([
          api.get("/warehouses/transfer-options"),
          api.get("/products"),
        ]);

        const fromList: Warehouse[] = (twRes.data?.fromWarehouses ?? []).map(
          (wh: any) => ({
            id: wh.id || wh._id || wh.code,
            name: wh.name,
            code: wh.code,
          })
        );

        const toList: Warehouse[] = (twRes.data?.toWarehouses ?? []).map(
          (wh: any) => ({
            id: wh.id || wh._id || wh.code,
            name: wh.name,
            code: wh.code,
          })
        );

        setWarehouses({
          from: fromList,
          to: toList,
        });

        setProducts(pRes.data ?? []);

        // default "From" warehouse: first allowed one
        if (!fromWarehouseId && fromList.length) {
          setFromWarehouseId(fromList[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ------------------ RESTORE + PERSIST TRANSFER ID ------------------
  useEffect(() => {
    const saved = localStorage.getItem("current_transfer_id");
    if (saved) setCreatedId(saved);
  }, []);

  useEffect(() => {
    if (createdId) {
      localStorage.setItem("current_transfer_id", createdId);
      loadTransferMedia(createdId);
    }
  }, [createdId]);

  // ------------------ LIVE SEARCH (DEBOUNCED) ------------------
  useEffect(() => {
    const q = search.trim();

    if (!q) {
      setResult([]);
      return;
    }

    if (q.length < 2) {
      setResult([]);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const res = await api.get("/products/search", {
          params: { q },
        });
        setResult(res.data || []);
      } catch {
        setResult([]);
      }
    }, 300);

    return () => window.clearTimeout(handle);
  }, [search]);

  // ------------------ MEDIA LIST ------------------
  async function loadTransferMedia(id: string) {
    if (!id) return;

    try {
      const res = await api.get("/inventory-media/list", {
        params: {
          transactionType: "TRANSFER",
          transactionId: id,
        },
      });
      setMediaList(res.data || []);
    } catch (e) {
      console.error("Media list error:", e);
    }
  }

  // ------------------ MEDIA UPLOAD ------------------
  async function handleUploadMedia() {
    if (!createdId) {
      setUploadErr("Create or approve transfer first");
      return;
    }
    if (!fromWarehouseId) {
      setUploadErr("Select From Warehouse first");
      return;
    }
    if (!files.length) {
      setUploadErr("Select at least one file");
      return;
    }

    setUploading(true);
    setUploadMsg("");
    setUploadErr("");

    try {
      const form = new FormData();
      form.append("transactionType", "TRANSFER");
      form.append("transactionId", createdId);
      form.append("direction", "OUT");
      form.append("warehouseId", fromWarehouseId);

      files.forEach((f) => form.append("files", f));

      const res = await api.post("/inventory-media/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadMsg(`Uploaded: ${res.data.media?.length || 0} file(s)`);
      setFiles([]);
      await loadTransferMedia(createdId);
    } catch (error: any) {
      setUploadErr(error?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // ------------------ LINE HELPERS ------------------
  const addLine = (p: Product) => {
    setLines((prev) => {
      const ex = prev.find((l) => l.productId === p._id);
      if (ex) {
        return prev.map((l) =>
          l.productId === p._id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { productId: p._id, quantity: 1 }];
    });

    setResult([]);
    setSearch("");
  };

  const updateLine = (i: number, patch: Partial<LineInput>) => {
    setLines((prev) => {
      const nxt = [...prev];
      nxt[i] = { ...nxt[i], ...patch };
      return nxt;
    });
  };

  const removeLine = (i: number) => {
    setLines((prev) => prev.filter((_, x) => x !== i));
  };

  // ------------------ CREATE TRANSFER ------------------
  const handleCreate = async () => {
    setErr("");
    setMsg("");
    setCreatedId(null);
    setMediaList([]);
    localStorage.removeItem("current_transfer_id");

    if (!fromWarehouseId || !toWarehouseId) {
      setErr("Select both warehouses");
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      setErr("Warehouses cannot be same");
      return;
    }
    if (!lines.length) {
      setErr("Add at least 1 product");
      return;
    }
    if (lines.some((l) => !l.quantity || l.quantity <= 0)) {
      setErr("Qty must be positive (pcs)");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/transfer", {
        fromWarehouseId,
        toWarehouseId,
        remarks,
        lines,
      });
      setCreatedId(res.data._id);
      setMsg("Transfer created — Approve to move stock.");
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ APPROVE ------------------
  const handleApprove = async () => {
    if (!createdId) return;

    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await api.post(`/transfer/${createdId}/approve`);
      setMsg(res.data.message || "Transfer approved");
      await loadTransferMedia(createdId);
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Approve failed");
    } finally {
      setLoading(false);
    }
  };

  // ------------------ OPTIONS ------------------
  const fromOptions = warehouses.from || [];
  const toOptions = (warehouses.to || []).filter(
    (w) => w.id !== fromWarehouseId
  );

  const safeLines = lines ?? [];

  // ------------------ UI ------------------
  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 px-3 py-4 text-slate-100 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Warehouse Transfer (WH → WH)
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm">
            Move stock from one warehouse to another. From WH = OUT, To WH =
            IN. Every transfer creates a clear movement trail.
          </p>
        </header>

        <div className="grid items-start gap-4 md:grid-cols-[1.5fr,1fr]">
          {/* LEFT: main workflow card */}
          <div className="space-y-5 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/90 via-slate-950/90 to-slate-900/90 p-4 shadow-xl sm:p-5">
            {/* Status strip */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Transfer status
                </div>
                <div className="text-sm text-slate-100">
                  {createdId ? (
                    <>
                      Transfer in progress –{" "}
                      <span className="font-semibold text-emerald-400">
                        ID: {createdId.slice(0, 6)}…{createdId.slice(-4)}
                      </span>
                    </>
                  ) : (
                    "Create a new transfer and then approve to move stock between warehouses."
                  )}
                </div>
              </div>
              {createdId && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-slate-800 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-700"
                    onClick={() =>
                      createdId && navigator.clipboard.writeText(createdId)
                    }
                  >
                    Copy ID
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-rose-500/80 px-3 py-1.5 text-[11px] text-rose-300 hover:bg-rose-500/10"
                    onClick={() => {
                      setCreatedId(null);
                      localStorage.removeItem("current_transfer_id");
                      setLines([]);
                      setRemarks("");
                      setMsg("");
                      setErr("");
                      setFiles([]);
                      setMediaList([]);
                      setUploadMsg("");
                      setUploadErr("");
                    }}
                  >
                    New Transfer
                  </button>
                </div>
              )}
            </div>

            {/* 1. WH selection + remarks */}
            <section className="space-y-3 border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  1. Select warehouses & remarks
                </h2>
                <span className="text-[11px] text-slate-500">
                  From WH → To WH
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">
                    From warehouse (stock OUT)
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    value={fromWarehouseId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFromWarehouseId(val);
                      if (val === toWarehouseId) setToWarehouseId("");
                    }}
                  >
                    <option value="">Select</option>
                    {fromOptions.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">
                    To warehouse (stock IN)
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    value={toWarehouseId}
                    onChange={(e) => setToWarehouseId(e.target.value)}
                  >
                    <option value="">Select</option>
                    {toOptions.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Remarks</label>
                <input
                  placeholder="e.g. stock balancing, damage replacement, internal movement"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </section>

            {/* 2. Search + lines */}
            <section className="space-y-4 border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  2. Add products to transfer
                </h2>
                <span className="text-[11px] text-slate-500">
                  Live suggestions by name / SKU / alias
                </span>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    placeholder="Search by name / SKU / alias"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>

                {result.length > 0 && (
                  <div className="max-h-52 overflow-auto rounded-lg border border-slate-800 bg-slate-950 text-sm">
                    {result.map((p) => (
                      <button
                        key={p._id}
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
                    No lines yet. Start typing above to search and add products.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {safeLines.map((line, idx) => {
                      const p = products.find((x) => x._id === line.productId);
                      return (
                        <div
                          key={line.productId || idx}
                          className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-xs"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-slate-100">
                              {p ? `${p.name} (${p.sku})` : line.productId}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400">
                              Qty (pcs)
                            </span>
                            <input
                              type="number"
                              value={line.quantity}
                              min={1}
                              onChange={(e) =>
                                updateLine(idx, {
                                  quantity: Number(e.target.value || 0),
                                })
                              }
                              className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                          </div>

                          <button
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
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Transfer (DRAFT)"}
                </button>

                {createdId && (
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve &amp; Move Stock
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
                      4. Transfer media (optional)
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Attach images/videos of stock being moved (pallets,
                      cartons, loading, etc.).
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Transaction:{" "}
                    <span className="font-mono">{createdId}</span>
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={(e) =>
                      setFiles(Array.from(e.target.files || []))
                    }
                    className="block w-full cursor-pointer rounded-md border border-slate-700 bg-slate-900 px-2 py-2 text-xs text-slate-100 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2 file:py-1 file:text-xs file:text-slate-200 hover:border-emerald-400"
                  />

                  <button
                    disabled={uploading || !files.length}
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
                        const url = `/inventory-media/${m.localPath}`;

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

          {/* RIGHT HELP PANEL */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">
            <b className="text-slate-100">Transfer rules / notes:</b>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>From WH = stock OUT, To WH = stock IN.</li>
              <li>Warehouses cannot be the same.</li>
              <li>No negative stock is allowed on approval.</li>
              <li>Each approval creates proper stock movement entries.</li>
              <li>
                Use remarks to record reason (e.g. balancing, damage, internal
                shift).
              </li>
              <li>
                Upload media for proof – helps later in disputes and audits.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransferPage;
   