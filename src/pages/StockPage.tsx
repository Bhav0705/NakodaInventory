// src/pages/StockPage.tsx
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface Warehouse {
  id: string;
  name: string;
  code: string;
}

interface StockRow {
  id: string;
  warehouse: Warehouse | null;
  product: {
    id: string;
    name: string;
    sku: string;
    category?: string;
  } | null;
  quantity: number;
  updatedAt: string;
}

interface LedgerRow {
  id: string;
  timestamp: string;
  transactionType: 'GRN' | 'DISPATCH' | 'TRANSFER' | 'ADJUSTMENT';
  direction: 'IN' | 'OUT';
  quantity: number;
  runningQuantity: number;
  notes?: string;
  transactionId: string;
}

const StockPage: React.FC = () => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWh, setSelectedWh] = useState<string>('');
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [search, setSearch] = useState('');
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [ledgerProductName, setLedgerProductName] = useState('');
  const [ledgerWarehouseName, setLedgerWarehouseName] = useState('');
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    async function loadWarehouses() {
      try {
        const res = await api.get('/warehouses');
        const w: Warehouse[] = (res.data ?? []).map((wh: any) => ({
          id: wh.id || wh._id || wh.code, // normalize id
          name: wh.name,
          code: wh.code,
        }));
        setWarehouses(w);

        // auto-select first warehouse user has access to
        if (user?.warehouses?.length) {
          const first = w.find((wh: Warehouse) =>
            user.warehouses.includes(wh.id)
          );
          if (first) setSelectedWh(first.id);
        } else if (w.length > 0) {
          setSelectedWh(w[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadWarehouses();
  }, [user]);

  useEffect(() => {
    if (!selectedWh) return;
    loadStock();
  }, [selectedWh]);

  const loadStock = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/stock', {
        params: { warehouseId: selectedWh },
      });
      setStock(res.data ?? []);
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to load stock');
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stock.filter((row) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = row.product?.name?.toLowerCase() || '';
    const sku = row.product?.sku?.toLowerCase() || '';
    const category = row.product?.category?.toLowerCase() || '';
    return name.includes(q) || sku.includes(q) || category.includes(q);
  });

  const openLedger = async (row: StockRow) => {
    if (!row.product || !row.warehouse) return;
    setLedgerLoading(true);
    setLedgerRows([]);
    setLedgerProductName(`${row.product.name} (${row.product.sku})`);
    setLedgerWarehouseName(row.warehouse.name);
    try {
      const res = await api.get('/stock/ledger', {
        params: {
          warehouseId: row.warehouse.id,
          productId: row.product.id,
          limit: 200,
        },
      });
      setLedgerRows(res.data ?? []);
    } catch (error) {
      console.error(error);
      setLedgerRows([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const formatDateTime = (value: string | Date) => {
    const d = new Date(value);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-100">
        Stock Summary (Per Warehouse)
      </h1>

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-300">
            Warehouse
          </label>
          <select
            value={selectedWh}
            onChange={(e) => setSelectedWh(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Select warehouse</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.code})
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-slate-300">
            Search (name / SKU / category)
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="e.g. Apple 20W, EL-A2305"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <button
            onClick={loadStock}
            disabled={!selectedWh || loading}
            className="mt-2 inline-flex items-center rounded-md bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0"
          >
            Refresh
          </button>
        </div>
      </div>

      {err && <div className="mb-3 text-sm text-orange-400">{err}</div>}

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 text-xs">
        <table className="min-w-full border-collapse">
          <thead className="bg-slate-900 text-slate-300">
            <tr>
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-right">Quantity (pcs)</th>
              <th className="px-3 py-2 text-left">Updated</th>
              <th className="px-3 py-2 text-left">Ledger</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-slate-400"
                >
                  Loading stock...
                </td>
              </tr>
            ) : filteredStock.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-4 text-center text-slate-400"
                >
                  No stock rows.
                </td>
              </tr>
            ) : (
              filteredStock.map((row) => (
                <tr key={row.id} className="border-t border-slate-800">
                  <td className="px-3 py-2">
                    {row.product?.name || '-'}
                  </td>
                  <td className="px-3 py-2">
                    {row.product?.sku || '-'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {row.quantity}
                  </td>
                  <td className="px-3 py-2">
                    {row.updatedAt ? formatDateTime(row.updatedAt) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {row.product && row.warehouse && (
                      <button
                        onClick={() => openLedger(row)}
                        className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-orange-500 hover:text-orange-300"
                      >
                        View Ledger
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ledger panel */}
      {ledgerProductName && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-100">
                Ledger: {ledgerProductName}
              </div>
              <div className="text-[11px] text-slate-400">
                Warehouse: {ledgerWarehouseName}
              </div>
            </div>
            <button
              onClick={() => {
                setLedgerProductName('');
                setLedgerRows([]);
              }}
              className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-red-500 hover:text-red-300"
            >
              Close
            </button>
          </div>

          {ledgerLoading ? (
            <div className="py-4 text-slate-400">Loading ledger...</div>
          ) : ledgerRows.length === 0 ? (
            <div className="py-4 text-slate-400">No movements found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-slate-900 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">IN/OUT</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Running</th>
                    <th className="px-3 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-800"
                    >
                      <td className="px-3 py-2">
                        {formatDateTime(row.timestamp)}
                      </td>
                      <td className="px-3 py-2">{row.transactionType}</td>
                      <td className="px-3 py-2">{row.direction}</td>
                      <td className="px-3 py-2 text-right">
                        {row.quantity}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {row.runningQuantity}
                      </td>
                      <td className="px-3 py-2">
                        {row.notes || ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StockPage;
