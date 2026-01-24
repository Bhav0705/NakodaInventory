// src/pages/MediaTestPage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

interface Warehouse {
  id: string;
  name: string;
  code?: string;
}

const MediaUploadPage: React.FC = () => {
  const { user } = useAuth();

  const [transactionType, setTransactionType] =
    useState<"GRN" | "DISPATCH" | "TRANSFER" | "ADJUSTMENT">("GRN");
  const [transactionId, setTransactionId] = useState("");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");

  const [warehouseId, setWarehouseId] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [files, setFiles] = useState<FileList | null>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [isUploading, setIsUploading] = useState(false);

 
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/warehouses");
        const raw = res.data ?? [];

        const normalized: Warehouse[] = raw.map((wh: any) => ({
          id: wh.id || wh._id, // support both shapes
          name: wh.name,
          code: wh.code,
        }));

        setWarehouses(normalized);

        // auto-select for manager
        if (user?.warehouses?.length) {
          const auto = normalized.find((w) => user.warehouses.includes(w.id));
          if (auto) setWarehouseId(auto.id);
        }
      } catch (e) {
        console.error("load warehouses error", e);
      }
    }
    load();
  }, [user]);

  const handleUpload = async () => {
    if (!transactionId) {
      setErr("Transaction ID is required.");
      setMsg("");
      return;
    }
    if (!warehouseId) {
      setErr("Please select a warehouse.");
      setMsg("");
      return;
    }
    if (!files || files.length === 0) {
      setErr("Please choose at least one file.");
      setMsg("");
      return;
    }

    setErr("");
    setMsg("");
    setIsUploading(true);

    try {
      const form = new FormData();
      form.append("transactionType", transactionType);
      form.append("transactionId", transactionId);
      form.append("direction", direction);
      form.append("warehouseId", warehouseId);
      Array.from(files).forEach((f) => form.append("files", f));

      const res = await api.post("/inventory-media/upload", form);

      setMsg(`Successfully uploaded ${res.data.media?.length || 0} file(s).`);
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const selectedWarehouse = warehouses.find((w) => w.id === warehouseId);

  return (
    <div className="min-h-[calc(100vh-120px)] bg-slate-950 px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-3xl">
        {/* Page header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-50 tracking-tight">
            Attach Media to Inventory Transaction
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl">
            Upload photos or videos as proof of goods movement for{" "}
            <span className="font-medium text-slate-200">
              GRN / Dispatch / Transfer / Adjustment
            </span>{" "}
            transactions.
          </p>
        </header>

        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-950/90 shadow-xl p-5 sm:p-6 space-y-6">
          {/* Top summary strip */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-slate-800/80 bg-slate-900/60 rounded-xl px-4 py-3">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                Current context
              </div>
              <div className="text-sm text-slate-100">
                Transaction:{" "}
                <span className="font-semibold">
                  {transactionType} – {direction}
                </span>
              </div>
              {selectedWarehouse ? (
                <div className="text-xs text-slate-400">
                  Warehouse:{" "}
                  <span className="text-slate-100 font-medium">
                    {selectedWarehouse.name}{" "}
                    {selectedWarehouse.code && `(${selectedWarehouse.code})`}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  No warehouse selected yet.
                </div>
              )}
            </div>
            <div className="text-xs text-slate-400">
              Make sure the{" "}
              <span className="font-medium text-slate-200">
                Transaction ID
              </span>{" "}
              matches your GRN / Dispatch / Transfer record.
            </div>
          </div>

          {/* Form body */}
          <div className="grid gap-5 md:grid-cols-2">
            {/* Left column */}
            <div className="space-y-4">
              {/* Transaction type + direction */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-[0.12em]">
                  Transaction details
                </label>
                <div className="flex gap-3">
                  <select
                    value={transactionType}
                    onChange={(e) =>
                      setTransactionType(
                        e.target.value as
                          | "GRN"
                          | "DISPATCH"
                          | "TRANSFER"
                          | "ADJUSTMENT"
                      )
                    }
                    className="flex-1 bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition"
                  >
                    <option value="GRN">GRN</option>
                    <option value="DISPATCH">Dispatch</option>
                    <option value="TRANSFER">Transfer</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>

                  <select
                    value={direction}
                    onChange={(e) =>
                      setDirection(e.target.value as "IN" | "OUT")
                    }
                    className="w-28 bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition"
                  >
                    <option value="IN">IN</option>
                    <option value="OUT">OUT</option>
                  </select>
                </div>
                <p className="text-xs text-slate-500">
                  Use <span className="font-medium">IN</span> for goods coming
                  into the warehouse and <span className="font-medium">OUT</span>{" "}
                  for goods leaving.
                </p>
              </div>

              {/* Transaction ID */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-[0.12em]">
                  Transaction ID
                </label>
                <input
                  placeholder="Paste the GRN / Dispatch / Transfer ID here"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition"
                />
                <p className="text-xs text-slate-500">
                  This is the database <code className="text-emerald-400">_id</code>{" "}
                  returned when you created the GRN / Dispatch / Transfer.
                </p>
              </div>

              {/* Warehouse select */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300 uppercase tracking-[0.12em]">
                  Warehouse
                </label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-lg px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500 transition"
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} {w.code && `(${w.code})`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  Only managers linked to a warehouse can upload media for it.
                </p>
              </div>
            </div>

            {/* Right column – File area */}
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-[0.12em]">
                Attach media
              </label>

              {/* Dropzone style container (input still native) */}
              <label className="group flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700/80 bg-slate-950/60 px-4 py-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-slate-900/70 transition">
                <div className="text-xs font-medium text-slate-200">
                  Click to browse files
                </div>
                <div className="text-[11px] text-slate-500">
                  Photos or videos up to your backend limit. Multiple files
                  allowed.
                </div>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="hidden"
                />
              </label>

              {/* Selected files list */}
              {files && files.length > 0 && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 max-h-32 overflow-y-auto">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>
                      Selected files:{" "}
                      <span className="text-slate-100 font-medium">
                        {files.length}
                      </span>
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300">
                    {Array.from(files).map((f) => (
                      <li
                        key={f.name + f.size}
                        className="flex items-center justify-between gap-2 border-b border-slate-800/60 last:border-0 pb-1 last:pb-0"
                      >
                        <span className="truncate max-w-[220px]">
                          {f.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {(f.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-slate-500">
                Tip: Capture clear photos of cartons, labels, and product
                condition for better audit history.
              </p>
            </div>
          </div>

          {/* Footer actions + status */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-800/70">
            <div className="flex gap-2">
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {isUploading ? "Uploading..." : "Upload media"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setErr("");
                  setMsg("");
                }}
                className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-900 transition"
              >
                Clear status
              </button>
            </div>

            <div className="min-h-[20px] text-sm">
              {msg && (
                <div className="text-emerald-400 text-xs sm:text-sm">
                  {msg}
                </div>
              )}
              {err && (
                <div className="text-amber-400 text-xs sm:text-sm">
                  {err}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaUploadPage;
