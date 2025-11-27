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

  // Load warehouses (normalize to {id, name, code})
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
          const auto = normalized.find((w) =>
            user.warehouses.includes(w.id)
          );
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
      setErr("Transaction ID required");
      return;
    }
    if (!warehouseId) {
      setErr("Select warehouse");
      return;
    }
    if (!files || files.length === 0) {
      setErr("Choose at least one file");
      return;
    }

    setErr("");
    setMsg("");

    try {
      const form = new FormData();
      form.append("transactionType", transactionType);
      form.append("transactionId", transactionId);
      form.append("direction", direction);
      form.append("warehouseId", warehouseId);
      Array.from(files).forEach((f) => form.append("files", f));

      const res = await api.post("/inventory-media", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMsg(`Uploaded: ${res.data.media?.length || 0} file(s)`);
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Upload failed");
    }
  };

  return (
    <div className="text-slate-100 p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-3">Upload Media</h1>

      <p className="text-sm opacity-70 mb-4">
        Attach photos/videos to any GRN / Dispatch / Transfer transaction.
        Transaction ID (from GRN/Dispatch/Transfer create response).
      </p>

      <div className="space-y-4 border border-slate-800 p-4 rounded-lg bg-slate-950">
        {/* Transaction type + direction */}
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
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          >
            <option value="GRN">GRN</option>
            <option value="DISPATCH">Dispatch</option>
            <option value="TRANSFER">Transfer</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>

          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}
            className="w-32 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
          >
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>

        {/* Transaction ID */}
        <input
          placeholder="Transaction ID (e.g. GRN _id)"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
        />

        {/* Warehouse select – this map must have a unique key */}
        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
        >
          <option value="">Select warehouse</option>
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} {w.code && `(${w.code})`}
            </option>
          ))}
        </select>

        {/* Files */}
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className="text-sm"
        />

        <button
          onClick={handleUpload}
          className="bg-emerald-500 text-slate-900 px-4 py-2 rounded text-sm font-semibold"
        >
          Upload
        </button>

        {msg && <div className="text-emerald-400 text-sm">{msg}</div>}
        {err && <div className="text-orange-400 text-sm">{err}</div>}
      </div>
    </div>
  );
};

export default MediaUploadPage;
