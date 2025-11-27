// src/pages/UsersPage.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'warehouse_admin' | 'warehouse_manager' | 'viewer';
  status: 'active' | 'inactive';
  assignedWarehouses: Warehouse[];
}

const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // create user form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] =
    useState<'super_admin' | 'warehouse_admin' | 'warehouse_manager' | 'viewer'>(
      'warehouse_manager'
    );
  const [assignedWh, setAssignedWh] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState('');

  // --------------------------------------------------------------------
  // Load users + warehouses
  // --------------------------------------------------------------------
  async function load() {
    setLoading(true);
    setErr('');
    try {
      const [uRes, wRes] = await Promise.all([
        api.get('/users'),      // listUsers controller
        api.get('/warehouses'), // listWarehouses controller
      ]);

      setUsers(uRes.data);

      // normalize warehouses so id is always defined and stable
      setWarehouses(
        (wRes.data ?? []).map((w: any) => ({
          id: w.id || w._id || w.code, // fallback to code if needed
          name: w.name,
          code: w.code,
        }))
      );
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // --------------------------------------------------------------------
  // Toggle warehouse assignment
  // - if userId omitted → create-form
  // - if userId provided → patch existing user
  // --------------------------------------------------------------------
  const toggleAssignedWh = (whId: string, userId?: string) => {
    if (!userId) {
      // create form
      setAssignedWh((prev) =>
        prev.includes(whId)
          ? prev.filter((id) => id !== whId)
          : [...prev, whId]
      );
      return;
    }

    const target = users.find((u) => u.id === userId);
    if (!target) return;

    const currentIds = target.assignedWarehouses.map((w) => w.id);
    const nextIds = currentIds.includes(whId)
      ? currentIds.filter((id) => id !== whId)
      : [...currentIds, whId];

    api
      .patch(`/users/${userId}/warehouses`, {
        assignedWarehouses: nextIds,
      })
      .then((res) => {
        // res.data has correct shape: UserRow
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? res.data : u))
        );
      })
      .catch((error) => {
        console.error(error);
        alert('Failed to update warehouses for user');
      });
  };

  // --------------------------------------------------------------------
  // Create new user
  // --------------------------------------------------------------------
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setErr('');
    setMsg('');

    try {
      await api.post('/users', {
        name,
        email,
        password,
        role,
        assignedWarehouses: assignedWh,
      });

      // Reload to keep shape consistent
      await load();

      setName('');
      setEmail('');
      setPassword('');
      setRole('warehouse_manager');
      setAssignedWh([]);
      setMsg('User created');
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  // --------------------------------------------------------------------
  // Guard: only super_admin can access this page
  // --------------------------------------------------------------------
  if (user?.role !== 'super_admin') {
    return (
      <div className="text-sm text-orange-400">
        Only super admin can manage users and managers.
      </div>
    );
  }

  // --------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------
  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-100">
        Users &amp; Managers
      </h1>

      {err && <div className="mb-3 text-sm text-orange-400">{err}</div>}
      {msg && <div className="mb-3 text-sm text-emerald-400">{msg}</div>}

      {/* Create user */}
      <form
        onSubmit={handleCreateUser}
        className="mb-6 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm"
      >
        <div className="mb-3 font-semibold text-slate-100">
          Create User / Manager
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-slate-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-300">Role</label>
            <select
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value as
                    | 'super_admin'
                    | 'warehouse_admin'
                    | 'warehouse_manager'
                    | 'viewer'
                )
              }
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="warehouse_manager">Warehouse Manager</option>
              <option value="warehouse_admin">Warehouse Admin</option>
              <option value="viewer">Viewer</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        </div>

        {/* Assign warehouses for new user */}
        <div className="mt-3">
          <div className="mb-1 text-xs text-slate-300">
            Assign Warehouses (manager kis-kis godown ka zimmedar hai)
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {warehouses.map((w) => {
              const selected = assignedWh.includes(w.id);
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => toggleAssignedWh(w.id)}
                  className={`rounded-full border px-3 py-1 ${
                    selected
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  {w.name}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="mt-4 rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? 'Creating...' : 'Create User'}
        </button>
      </form>

      {/* Users list */}
      {loading ? (
        <div className="text-sm text-slate-300">Loading users...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 text-xs">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-900 text-slate-300">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Role</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Warehouses</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{u.status}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {warehouses.map((w) => {
                        const selected = u.assignedWarehouses.some(
                          (aw) => aw.id === w.id
                        );
                        return (
                          <button
                            key={`${u.id}-${w.id}`} // composite key per user+warehouse
                            type="button"
                            onClick={() => toggleAssignedWh(w.id, u.id)}
                            className={`rounded-full border px-2 py-0.5 ${
                              selected
                                ? 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
                                : 'border-slate-700 bg-slate-900 text-slate-400'
                            }`}
                          >
                            {w.code || w.name}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
