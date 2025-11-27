// src/pages/DispatchPage.tsx
import React, { useEffect, useState } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

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

  // load warehouses + products
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

        // auto-select for manager
        if (user?.warehouses?.length) {
          const firstMatch = ws.find((x: { id: string }) =>
            user.warehouses.includes(x.id)
          );
          if (firstMatch) setWarehouseId(firstMatch.id);
        }
      } catch (e) {
        console.error("Load error", e);
      }
    }
    load();
  }, [user]);

  // restore last dispatch id
  useEffect(() => {
    const saved = localStorage.getItem("current_dispatch_id");
    if (saved) setCreatedId(saved);
  }, []);

  // persist dispatch id
  useEffect(() => {
    if (createdId) {
      localStorage.setItem("current_dispatch_id", createdId);
    }
  }, [createdId]);

  // search products
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

  // add line
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

  // update line
  function updateLine(index: number, patch: Partial<LineInput>) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  // remove line
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  // create dispatch
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

  // approve dispatch
  async function handleApprove() {
    if (!createdId) return;

    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const res = await api.post(`/dispatch/${createdId}/approve`);
      setMsg(res.data.message || "Approved");
      // clear lines but keep createdId for media
      setLines([]);
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to approve");
    } finally {
      setLoading(false);
    }
  }

  // reset for new dispatch
  function resetDispatch() {
    setCreatedId(null);
    localStorage.removeItem("current_dispatch_id");
    setLines([]);
    setPartyName("");
    setMsg("");
    setErr("");
  }

  const safeLines = lines ?? [];
  const safeWarehouses = warehouses ?? [];

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-100">
        Dispatch (Goods Out)
      </h1>

      {(!user?.warehouses || user?.warehouses?.length === 0) && (
        <p className="mb-3 text-xs text-orange-400">
          This user has no assigned warehouses. Ask super admin to assign.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-[1.4fr,1fr] items-start">
        {/* Left block */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-100">
          {/* Warehouse + party */}
          <div className="mb-3 flex gap-2">
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select warehouse</option>
              {safeWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>

            <input
              placeholder="Party / Customer name"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Search */}
          <div className="mb-3">
            <div className="mb-1 text-sm text-slate-200">Add product</div>
            <div className="flex gap-2">
              <input
                placeholder="Search by name/SKU/alias"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={handleSearch}
                className="rounded-md bg-blue-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-blue-400"
              >
                Search
              </button>
            </div>

            {searchResult?.length > 0 && (
              <div className="mt-2 max-h-40 overflow-auto rounded-md border border-slate-800 bg-slate-950 text-xs">
                {searchResult.map((p) => (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => addLine(p)}
                    className="flex w-full items-start justify-between border-b border-slate-800 px-3 py-2 text-left hover:bg-slate-900"
                  >
                    <span>{p.name}</span>
                    <span className="text-[11px] text-slate-400">
                      {p.sku}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lines */}
          <div>
            <div className="mb-1 text-sm font-medium text-slate-200">
              Lines
            </div>

            {safeLines.length === 0 && (
              <div className="text-xs text-slate-400">
                No lines added yet.
              </div>
            )}

            <div className="mt-2 space-y-2">
              {safeLines.map((line, idx) => {
                const product = products.find((p) => p._id === line.productId);
                return (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {product
                          ? `${product.name} (${product.sku})`
                          : line.productId}
                      </div>
                    </div>

                    <select
                      value={line.packingType}
                      onChange={(e) =>
                        updateLine(idx, {
                          packingType: e.target
                            .value as LineInput["packingType"],
                        })
                      }
                      className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                        updateLine(idx, {
                          quantity: Number(e.target.value || 0),
                        })
                      }
                      className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      placeholder="Qty"
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
                      className="w-24 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      placeholder="Qty (pcs)"
                      title="Quantity in base unit (pcs)"
                    />

                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="rounded-md border border-orange-500 px-2 py-1 text-[11px] text-orange-400 hover:bg-orange-500/10"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={handleCreate}
              disabled={loading}
              className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Working..." : "Save Dispatch (DRAFT)"}
            </button>

            {createdId && (
              <button
                onClick={handleApprove}
                disabled={loading}
                className="rounded-md bg-orange-500 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Approve + Deduct Stock
              </button>
            )}
          </div>

          {msg && (
            <div className="mt-2 text-xs text-emerald-400">{msg}</div>
          )}

          {err && (
            <div className="mt-2 text-xs text-orange-400">{err}</div>
          )}

          {/* Transaction ID + media upload */}
          {createdId && (
            <div className="mt-4 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
              <div className="mb-1 font-semibold text-slate-100">
                Transaction ID (Dispatch)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-[11px] text-slate-100">
                  {createdId}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    createdId && navigator.clipboard.writeText(createdId)
                  }
                  className="rounded-md bg-slate-500 px-2 py-1 text-[11px] font-semibold text-slate-900 hover:bg-slate-400"
                >
                  Copy
                </button>

                <button
                  type="button"
                  onClick={resetDispatch}
                  className="rounded-md bg-red-500 px-2 py-1 text-[11px] font-semibold text-slate-50 hover:bg-red-400"
                >
                  New dispatch
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - instructions */}
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-200">
          <strong className="block mb-2 text-slate-100">
            How to use:
          </strong>
          <ol className="ml-4 list-decimal space-y-1">
            <li>Select warehouse jahan se maal jayega.</li>
            <li>Enter party/customer name.</li>
            <li>Search product and add lines.</li>
            <li>
              Qty (pcs) = <span className="font-semibold">quantityBase</span>{" "}
              correctly set in pieces.
            </li>
            <li>Save → Dispatch DRAFT banega.</li>
            <li>Approve → Stock OUT hogi from warehouse.</li>
            <li>
              Approve ke baad upar Transaction ID se{" "}
              <span className="font-semibold">Upload media</span> se
              photo/video attach kar sakte ho.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default DispatchPage;
