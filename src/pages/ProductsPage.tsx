import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Product {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  baseUnit: string;
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
      await api.post('/products', { name, sku, category, baseUnit: 'PCS' });
      setName('');
      setSku('');
      setCategory('');
      load();
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to create product');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Products</h1>
      {loading && <div>Loading...</div>}
      {err && <div style={{ color: '#f97316', marginBottom: 8 }}>{err}</div>}

      {user?.role === 'super_admin' && (
        <form
          onSubmit={handleCreate}
          style={{
            marginBottom: 20,
            padding: 12,
            borderRadius: 8,
            border: '1px solid #1e293b',
            maxWidth: 500
          }}
        >
          <div style={{ fontSize: 14, marginBottom: 8, fontWeight: 600 }}>Create Product</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #334155' }}
            />
            <input
              placeholder="SKU"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #334155' }}
            />
          </div>
          <input
            placeholder="Category (optional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: '100%',
              padding: 6,
              borderRadius: 6,
              border: '1px solid #334155',
              marginBottom: 8
            }}
          />
          <button
            type="submit"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              background: '#22c55e',
              color: '#020617',
              fontSize: 13,
              fontWeight: 600
            }}
          >
            Save
          </button>
        </form>
      )}

      {!loading && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 14
          }}
        >
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
              <th style={{ padding: 8 }}>Name</th>
              <th style={{ padding: 8 }}>SKU</th>
              <th style={{ padding: 8 }}>Category</th>
              <th style={{ padding: 8 }}>Base Unit</th>
              <th style={{ padding: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p._id} style={{ borderBottom: '1px solid #1e293b' }}>
                <td style={{ padding: 8 }}>{p.name}</td>
                <td style={{ padding: 8 }}>{p.sku}</td>
                <td style={{ padding: 8 }}>{p.category}</td>
                <td style={{ padding: 8 }}>{p.baseUnit}</td>
                <td style={{ padding: 8 }}>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProductsPage;
