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
  packingType: "LOOSE" | "KATTA" | "MASTER" | "OTHER";
  quantity: number;
  quantityBase: number;
}

export default function DispatchPage() {
  const { user } = useAuth();

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

  /** Load warehouses + products */
  useEffect(() => {
    async function load() {
      try {
        const [wRes, pRes] = await Promise.all([
          api.get("/warehouses"),
          api.get("/products"),
        ]);

        const ws = (wRes.data ?? []).map((wh: any) => ({
          id: wh.id || wh._id,
          name: wh.name,
          code: wh.code,
        }));

        setWarehouses(ws);
        setProducts(pRes.data ?? []);

        // Auto-select warehouse for manager or single warehouse
        if (user?.warehouses?.length) {
          const firstMatch = ws.find((x: { id: string; }) => user.warehouses.includes(x.id));
          if (firstMatch) setWarehouseId(firstMatch.id);
        }
      } catch (e) {
        console.error("Load error", e);
      }
    }
    load();
  }, [user]);

  /** Product search */
  async function handleSearch() {
    if (!search.trim()) {
      setSearchResult([]);
      return;
    }
    try {
      const res = await api.get("/products/search", { params: { q: search } });
      setSearchResult(res.data ?? []);
    } catch (e) {
      console.error(e);
    }
  }

  /** Add product line */
  function addLine(prod: Product) {
    setLines((prev) => [
      ...prev,
      {
        productId: prod._id,
        packingType: "LOOSE",
        quantity: 1,
        quantityBase: 1,
      },
    ]);
    setSearch("");
    setSearchResult([]);
  }

  /** Update product line */
  function updateLine(index: number, patch: Partial<LineInput>) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  /** Remove product line */
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  /** Create dispatch */
  async function handleCreate() {
    setErr("");
    setMsg("");

    if (!warehouseId) return setErr("Select warehouse");
    if (lines.length === 0) return setErr("Add at least one product");

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

  /** Approve dispatch */
  async function handleApprove() {
    if (!createdId) return;

    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await api.post(`/dispatch/${createdId}/approve`);
      setMsg(res.data.message || "Approved");
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  const safeLines = lines ?? [];
  const safeWarehouses = warehouses ?? [];

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Dispatch (Goods Out)</h1>

      {(!user?.warehouses || user?.warehouses?.length === 0) && (
        <p style={{ fontSize: 13, color: "#f97316" }}>
          This user has no assigned warehouses. Ask super admin to assign.
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        {/* Left block */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #1e293b",
          }}
        >
          {/* Warehouse & party */}
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              style={{
                flex: 1,
                padding: 6,
                borderRadius: 6,
                border: "1px solid #334155",
              }}
            >
              <option value="">Select warehouse</option>
              {(safeWarehouses ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>

            <input
              placeholder="Party / Customer name"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              style={{
                flex: 1,
                padding: 6,
                borderRadius: 6,
                border: "1px solid #334155",
              }}
            />
          </div>

          {/* Search */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 14, marginBottom: 4 }}>Add product</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="Search by name/SKU/alias"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  flex: 1,
                  padding: 6,
                  borderRadius: 6,
                  border: "1px solid #334155",
                }}
              />
              <button
                onClick={handleSearch}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  background: "#3b82f6",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Search
              </button>
            </div>

            {searchResult?.length > 0 && (
              <div
                style={{
                  marginTop: 6,
                  borderRadius: 6,
                  border: "1px solid #1e293b",
                  maxHeight: 160,
                  overflow: "auto",
                  background: "#020617",
                }}
              >
                {searchResult.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => addLine(p)}
                    style={{
                      padding: 6,
                      borderBottom: "1px solid #1e293b",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    {p.name} ({p.sku})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lines */}
          <div>
            <div style={{ fontSize: 14, margin: "8px 0" }}>Lines</div>

            {safeLines.length === 0 && (
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                No lines added yet.
              </div>
            )}

            {safeLines.map((line, idx) => {
              const product = products.find((p) => p._id === line.productId);
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <div style={{ flex: 2, fontSize: 13 }}>
                    {product
                      ? `${product.name} (${product.sku})`
                      : line.productId}
                  </div>

                  <select
                    value={line.packingType}
                    onChange={(e) =>
                      updateLine(idx, {
                        packingType: e.target.value as LineInput["packingType"],
                      })
                    }
                    style={{
                      padding: 4,
                      borderRadius: 6,
                      border: "1px solid #334155",
                      fontSize: 13,
                    }}
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
                      updateLine(idx, { quantity: Number(e.target.value || 0) })
                    }
                    style={{
                      width: 80,
                      padding: 4,
                      borderRadius: 6,
                      border: "1px solid #334155",
                      fontSize: 13,
                    }}
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
                    style={{
                      width: 100,
                      padding: 4,
                      borderRadius: 6,
                      border: "1px solid #334155",
                      fontSize: 13,
                    }}
                    title="Quantity in base unit (pcs)"
                  />

                  <button
                    onClick={() => removeLine(idx)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid #f97316",
                      background: "transparent",
                      color: "#f97316",
                      fontSize: 12,
                    }}
                  >
                    X
                  </button>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              onClick={handleCreate}
              disabled={loading}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "none",
                background: "#22c55e",
                color: "#020617",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              {loading ? "Working..." : "Save Dispatch (DRAFT)"}
            </button>

            {createdId && (
              <button
                onClick={handleApprove}
                disabled={loading}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "none",
                  background: "#f97316",
                  color: "#020617",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Approve + Deduct Stock
              </button>
            )}
          </div>

          {msg && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#22c55e" }}>
              {msg}
            </div>
          )}

          {err && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#f97316" }}>
              {err}
            </div>
          )}
        </div>

        {/* Right Panel - instructions */}
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            border: "1px solid #1e293b",
            fontSize: 13,
          }}
        >
          <strong>How to use:</strong>
          <ol style={{ paddingLeft: 18, lineHeight: 1.5 }}>
            <li>Select warehouse jahan se maal jayega.</li>
            <li>Enter party/customer name.</li>
            <li>Search product and add lines.</li>
            <li>Set quantityBase correctly in PCS.</li>
            <li>Save → Dispatch will be DRAFT.</li>
            <li>Approve → Stock OUT hogi from warehouse.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
