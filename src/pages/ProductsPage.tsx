// src/pages/ProductsPage.tsx
import React, { useEffect, useState, useRef, useMemo } from "react";
import { api } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { resolveMediaUrl } from "../utils/media";

interface Product {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  baseUnit: "PCS";
  status: string;
  mainImageUrl?: string;
  images?: string[];
}

const ProductsPage: React.FC = () => {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // create form
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  async function load() {
    try {
      const res = await api.get("/products");
      setProducts(res.data ?? []);
      setErr("");
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!name.trim() || !sku.trim()) {
      setErr("Name and SKU are required");
      return;
    }

    if (!file) {
      setErr("Please upload at least one product image.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("sku", sku.trim());
      if (category.trim()) formData.append("category", category.trim());
      formData.append("media", file); // multer.single('media')

      await api.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setName("");
      setSku("");
      setCategory("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setLoading(true);
      await load();
    } catch (error: any) {
      setErr(error?.response?.data?.message || "Failed to create product");
    }
  };

  // stats
  const totalCount = products.length;
  const activeCount = products.filter((p) => p.status === "active").length;

  // derived filters
  const uniqueCategories = useMemo(
    () =>
      Array.from(
        new Set(
          products
            .map((p) => p.category?.trim())
            .filter((c): c is string => !!c)
        )
      ),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;

      if (q) {
        const haystack = `${p.name} ${p.sku} ${p.category || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [products, search, statusFilter]);

  const showEmpty = !loading && filteredProducts.length === 0;

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-950 px-3 py-4 text-slate-50 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Products
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm">
              Central list of all SKUs used in GRN, Dispatch, and Transfers. Maintain clean
              master data with image-first records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              load();
            }}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-emerald-400 hover:text-emerald-300"
          >
            Refresh
          </button>
        </header>

        {/* Top strip: stats + filters */}
        <div className="grid gap-4 md:grid-cols-[1.3fr,1fr]">
          {/* Stats + filters */}
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 shadow-lg">
            {/* Stats row */}
            <div className="flex flex-wrap gap-3 text-xs">
              <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Total Products
                </span>
                <span className="mt-1 text-lg font-semibold text-slate-50">
                  {totalCount}
                </span>
              </div>
              <div className="flex flex-col rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">
                  Active
                </span>
                <span className="mt-1 text-lg font-semibold text-emerald-300">
                  {activeCount}
                </span>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-slate-300">
                  Search (name / SKU / category)
                </label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. Apple 20W, EL-A2305"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                />
              </div>

              <div className="w-full space-y-1 sm:w-40">
                <label className="text-xs text-slate-300">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "active" | "inactive"
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {uniqueCategories.length > 0 && (
                <div className="w-full space-y-1 sm:w-40">
                  <label className="text-xs text-slate-300">Quick category</label>
                  <select
                    onChange={(e) => {
                      const v = e.target.value;
                      setSearch(v ? v : "");
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    defaultValue=""
                  >
                    <option value="">All</option>
                    {uniqueCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Create product card */}
          {user?.role === "super_admin" && (
            <form
              onSubmit={handleCreate}
              className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 text-xs sm:text-sm shadow-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold text-slate-100">Create product</div>
                <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-400">
                  Base unit: PCS
                </span>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-300">
                    Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    placeholder="e.g. EL-A2305 20W PD Charger"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">
                    SKU <span className="text-rose-400">*</span>
                  </label>
                  <input
                    placeholder="e.g. EL-A2305PD-WHT"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-300">
                    Category (optional)
                  </label>
                  <input
                    placeholder="e.g. Charger, Neckband, Cable"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-slate-300">
                    Product image (required)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setFile(f);
                    }}
                    className="block w-full cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-950 hover:file:bg-emerald-400"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Sharp white-background e-commerce image. JPG, PNG, WebP. Max 5MB.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!name.trim() || !sku.trim()}
              >
                Save Product
              </button>
            </form>
          )}
        </div>

        {/* Error banner */}
        {err && (
          <div className="rounded-xl border border-amber-500/70 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            {err}
          </div>
        )}

        {/* Products table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70">
          <table className="min-w-[780px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/90 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Base Unit</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-800">
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 animate-pulse rounded-md bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-40 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-28 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 animate-pulse rounded-full bg-slate-800" />
                    </td>
                  </tr>
                ))}

              {!loading &&
                filteredProducts.map((p) => (
                  <tr
                    key={p._id}
                    className="border-b border-slate-800 last:border-b-0 hover:bg-slate-900"
                  >
                    {/* Thumbnail */}
                    <td className="px-4 py-3 align-top">
                      {p.mainImageUrl ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={resolveMediaUrl(p.mainImageUrl)}
                            alt={p.name}
                            className="h-10 w-10 rounded-md border border-slate-700 bg-slate-950 object-cover"
                          />
                          {p.images && p.images.length > 1 && (
                            <span className="text-[11px] text-slate-400">
                              +{p.images.length - 1} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs italic text-slate-500">
                          No image
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-100">
                      <div className="font-medium">{p.name}</div>
                      {p.category && (
                        <div className="text-[11px] text-slate-500">
                          {p.category}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-200">
                      <span className="inline-flex rounded-md bg-slate-900 px-2 py-1 font-mono text-[11px]">
                        {p.sku}
                      </span>
                    </td>

                    <td className="px-4 py-3 align-top text-slate-300">
                      {p.category || "-"}
                    </td>

                    <td className="px-4 py-3 align-top text-slate-300">
                      {p.baseUnit}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          p.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/40"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {p.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}

              {showEmpty && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-slate-400"
                  >
                    No products match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
