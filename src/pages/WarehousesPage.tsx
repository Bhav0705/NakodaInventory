// src/pages/WarehousesPage.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Warehouse {
  id: string;
  name: string;
  code: string;
  address?: string;
  status: 'active' | 'inactive';
}

const WarehousesPage: React.FC = () => {
  const { user } = useAuth();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // create form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');

  async function load() {
    try {
      const res = await api.get('/warehouses');
      const ws: Warehouse[] = (res.data ?? []).map((w: any) => ({
        id: w.id || w._id || w.code, // normalize id so it is always defined
        name: w.name,
        code: w.code,
        address: w.address,
        status: w.status,
      }));
      setWarehouses(ws);
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to load warehouses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setMsg('');

    try {
      await api.post('/warehouses', { name, code, address });
      setName('');
      setCode('');
      setAddress('');
      setMsg('Warehouse created');
      setLoading(true);
      await load();
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to create warehouse');
    }
  }

  async function toggleStatus(id: string, current: string) {
    try {
      await api.patch(`/warehouses/${id}`, {
        status: current === 'active' ? 'inactive' : 'active',
      });
      setLoading(true);
      await load();
    } catch (error: any) {
      alert('Failed to change status');
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-white">Warehouse Master</h1>

      {err && <p className="mb-2 text-sm text-red-400">{err}</p>}
      {msg && <p className="mb-2 text-sm text-emerald-400">{msg}</p>}

      {/* 1 — Create form only super admin */}
      {user?.role === 'super_admin' && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-lg bg-slate-900 p-4 text-sm"
        >
          <div className="grid grid-cols-3 gap-4">
            <input
              placeholder="Name"
              className="rounded bg-slate-800 p-2 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              placeholder="Code"
              className="rounded bg-slate-800 p-2 text-white"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <input
              placeholder="Address (optional)"
              className="rounded bg-slate-800 p-2 text-white"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="mt-4 rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Create Warehouse
          </button>
        </form>
      )}

      {/* 2 — Warehouse list */}
      {loading ? (
        <div className="text-sm text-slate-300">Loading...</div>
      ) : (
        <table className="w-full overflow-hidden rounded-lg bg-slate-900 text-sm text-slate-300">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Code</th>
              <th className="p-2 text-left">Address</th>
              <th className="p-2 text-left">Status</th>
              {user?.role === 'super_admin' && (
                <th className="p-2 text-left">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {warehouses.map((w) => (
              <tr key={w.id} className="border-t border-slate-800">
                <td className="p-2">{w.name}</td>
                <td className="p-2">{w.code}</td>
                <td className="p-2">{w.address}</td>

                <td
                  className={`p-2 font-semibold ${
                    w.status === 'active'
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {w.status}
                </td>

                {user?.role === 'super_admin' && (
                  <td className="p-2">
                    <button
                      onClick={() => toggleStatus(w.id, w.status)}
                      className="rounded bg-slate-700 px-3 py-1 text-xs text-white"
                    >
                      {w.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default WarehousesPage;
