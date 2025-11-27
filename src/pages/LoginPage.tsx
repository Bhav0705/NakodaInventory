import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // for first admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminMsg, setAdminMsg] = useState('');
  const [adminErr, setAdminErr] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminErr('');
    setAdminMsg('');
    setAdminLoading(true);
    try {
      const res = await api.post('/auth/register-super-admin', {
        name: adminName || 'Admin',
        email: adminEmail,
        password: adminPassword,
      });
      setAdminMsg('Super admin created. Now login with this email & password.');
      // optional: prefill login form
      setEmail(adminEmail);
      setPassword(adminPassword);
      console.log('Created super admin:', res.data.user);
    } catch (error: any) {
      setAdminErr(error?.response?.data?.message || 'Failed to create super admin');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-full max-w-3xl flex flex-col md:flex-row gap-8 px-4">
        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-6 py-6 shadow-lg"
        >
          <h1 className="mb-4 text-xl font-semibold text-slate-100">Login</h1>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {err && (
            <div className="mb-2 text-xs text-orange-400">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-md bg-orange-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* One-time super admin creator */}
        <form
          onSubmit={handleCreateSuperAdmin}
          className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-6 py-6 shadow-lg"
        >
          <h2 className="mb-3 text-sm font-semibold text-slate-100">
            First time setup – Create Super Admin
          </h2>
          <p className="mb-4 text-xs text-slate-400">
            Run this only once to create your first admin. After that, use the login form on the left.
          </p>

          <div className="mb-2">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Name
            </label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. Bhavesh"
            />
          </div>

          <div className="mb-2">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Admin Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="admin@nakoda.com"
            />
          </div>

          <div className="mb-3">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Admin Password
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {adminErr && (
            <div className="mb-2 text-xs text-orange-400">
              {adminErr}
            </div>
          )}
          {adminMsg && (
            <div className="mb-2 text-xs text-emerald-400">
              {adminMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={adminLoading}
            className="mt-2 w-full rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {adminLoading ? 'Creating...' : 'Create Super Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
