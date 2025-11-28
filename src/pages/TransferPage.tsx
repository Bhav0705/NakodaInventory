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

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
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
        const [wRes, pRes] = await Promise.all([
          api.get("/warehouses"),
          api.get("/products"),
        ]);

        const w: Warehouse[] = (wRes.data ?? []).map((wh: any) => ({
          id: wh.id || wh._id || wh.code,
          name: wh.name,
          code: wh.code,
        }));

        setWarehouses(w);
        setProducts(pRes.data ?? []);

        if (user?.warehouses?.length) {
          const first = w.find((x) => user.warehouses.includes(x.id));
          if (first) setFromWarehouseId(first.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, [user]);

  // ------------------ SEARCH PRODUCT ------------------
  const handleSearch = async () => {
    if (!search.trim()) {
      setResult([]);
      return;
    }

    try {
      const res = await api.get("/products/search", {
        params: { q: search.trim() },
      });
      setResult(res.data || []);
    } catch {
      setResult([]);
    }
  };

  // ------------------ MEDIA LIST ------------------
async function loadTransferMedia() {
  if (!createdId) return;

  try {
    const res = await api.get("/inventory-media/list", {
      params: {
        transactionType: "TRANSFER",
        transactionId: createdId,
      },
    });
    setMediaList(res.data || []);
  } catch (e) {
    console.error("Media list error:", e);
  }
}


  
async function handleUploadMedia() {
  if (!createdId) {
    setUploadErr("Create or approve transfer first");
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
    loadTransferMedia();
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
          l.productId === p._id
            ? { ...l, quantity: l.quantity + 1 }
            : l
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
      setMsg("Transfer Created — Approve to move stock");
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed");
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
      setMsg(res.data.message || "Transfer Approved");
      loadTransferMedia();
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Approve failed");
    } finally {
      setLoading(false);
    }
  };

  // Options
  const assigned = user?.warehouses ?? [];
  const fromOptions =
    user?.role === "super_admin"
      ? warehouses
      : warehouses.filter((w) => assigned.includes(w.id));

  const toOptions = warehouses.filter((w) => w.id !== fromWarehouseId);

  // ------------------ UI ------------------
  return (
    <div className="text-slate-100">
      <h1 className="text-xl mb-4 font-semibold">Warehouse Transfer (WH → WH)</h1>

      <div className="grid gap-4 md:grid-cols-[1.4fr,1fr]">
        {/* LEFT */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm">

          {/* From / To */}
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-slate-300">From Warehouse</label>
              <select
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded"
                value={fromWarehouseId}
                onChange={(e) => {
                  setFromWarehouseId(e.target.value);
                  if (e.target.value === toWarehouseId) setToWarehouseId("");
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

            <div>
              <label className="text-xs text-slate-300">To Warehouse</label>
              <select
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded"
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

          {/* Remarks */}
          <input
            placeholder="Remarks"
            className="w-full mb-3 px-3 py-2 bg-slate-900 border border-slate-700 rounded"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          {/* Product Search */}
          <div className="mb-3">
            <div className="flex gap-2">
              <input
                placeholder="Search by name/SKU/alias"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded"
              />
              <button
                onClick={handleSearch}
                className="bg-blue-500 px-3 py-2 rounded text-slate-900 text-xs"
              >
                Search
              </button>
            </div>

            {result.length > 0 && (
              <div className="max-h-40 overflow-auto mt-2 text-xs border border-slate-700 rounded bg-slate-900">
                {result.map((p) => (
                  <button
                    key={p._id}
                    onClick={() => addLine(p)}
                    className="flex w-full justify-between px-3 py-2 border-b border-slate-800 hover:bg-slate-800"
                  >
                    <span>{p.name}</span>
                    <span className="text-slate-400">{p.sku}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lines */}
          <div className="space-y-2">
            {lines.map((line, idx) => {
              const p = products.find((x) => x._id === line.productId);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 border border-slate-700 bg-slate-900 px-3 py-2 rounded text-xs"
                >
                  <div className="flex-1">
                    {p ? `${p.name} (${p.sku})` : line.productId}
                  </div>

                  <input
                    type="number"
                    value={line.quantity}
                    min={1}
                    onChange={(e) =>
                      updateLine(idx, {
                        quantity: Number(e.target.value || 0),
                      })
                    }
                    className="w-20 px-2 py-1 text-right border border-slate-600 rounded bg-slate-950"
                  />

                  <button
                    onClick={() => removeLine(idx)}
                    className="border border-red-500 text-red-300 px-2 py-1 rounded"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <button
              className="bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900 rounded"
              onClick={handleCreate}
              disabled={loading}
            >
              Save (DRAFT)
            </button>

            {createdId && (
              <button
                onClick={handleApprove}
                disabled={loading}
                className="bg-orange-500 px-4 py-2 text-xs font-semibold text-slate-900 rounded"
              >
                Approve + Move
              </button>
            )}
          </div>

          {msg && <div className="text-emerald-400 mt-2">{msg}</div>}
          {err && <div className="text-orange-400 mt-2">{err}</div>}

          {/* ======= MEDIA SECTION ======= */}
          {createdId && (
            <div className="mt-4 border border-slate-700 rounded bg-slate-900 p-3 text-xs">
              <div className="font-semibold mb-1">Upload Media</div>

              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="w-full"
              />

              <button
                disabled={uploading}
                onClick={handleUploadMedia}
                className="mt-2 px-3 py-1 rounded bg-blue-500 text-slate-900 font-semibold"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>

              {uploadMsg && <div className="text-green-400 mt-1">{uploadMsg}</div>}
              {uploadErr && <div className="text-red-400 mt-1">{uploadErr}</div>}

              {mediaList.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="font-semibold text-slate-300">Files</div>
                  {mediaList.map((m) => (
                    <a
                      key={m._id}
                      target="_blank"
                      href={`/inventory-media/${m.localPath}`}
                      className="block px-2 py-1 border border-slate-700 rounded bg-slate-800 hover:bg-slate-700 truncate"
                    >
                      {m.fileType.toUpperCase()} — {m.localPath}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT HELP PANEL */}
        <div className="border border-slate-800 bg-slate-950 rounded-xl p-4 text-xs text-slate-300">
          <b className="text-slate-100">Rules:</b>
          <ul className="list-disc ml-4 mt-2 space-y-1">
            <li>From WH = OUT</li>
            <li>To WH = IN</li>
            <li>No negative stock allowed</li>
            <li>Approval creates ledger entries</li>
            <li>Upload images/videos after draft or approval</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TransferPage;
