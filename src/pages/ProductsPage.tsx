import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  baseUnit: 'PCS';   // always PCS in your new system
  status: string;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const { user } = useAuth();

  async function load() {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      // backend now always sets baseUnit = 'PCS'
      await api.post('/products', { name, sku, category });
      setName('');
      setSku('');
      setCategory('');
      load();
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to create product');
    }
  };

  return (
    <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Title */}
        <h1 className="text-xl font-semibold text-slate-50 sm:text-2xl">
          Products
        </h1>

        {/* Error */}
        {err && (
          <div className="rounded-xl border border-amber-500/70 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            {err}
          </div>
        )}

        {/* Create product (super admin only) */}
        {user?.role === 'super_admin' && (
          <form
            onSubmit={handleCreate}
            className="max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-4 shadow-sm sm:px-5 sm:py-5"
          >
            <div className="mb-3 text-sm font-semibold text-slate-100">
              Create Product
            </div>

            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <input
                placeholder="SKU"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <input
              placeholder="Category (optional)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mb-3 w-full rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />

            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!name || !sku}
            >
              Save
            </button>
          </form>
        )}

        {/* List */}
        {loading ? (
          <div className="text-sm text-slate-300">Loading...</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
            <table className="min-w-[600px] w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Base Unit</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p._id}
                    className="border-b border-slate-800 last:border-b-0 hover:bg-slate-900"
                  >
                    <td className="px-4 py-3 text-slate-100">{p.name}</td>
                    <td className="px-4 py-3 text-slate-200">{p.sku}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {p.category || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{p.baseUnit}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-700/60 text-slate-300'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-4 text-center text-sm text-slate-400"
                    >
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;
