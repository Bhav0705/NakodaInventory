import React, { useState } from 'react';
import { api } from '../services/api';

const MediaTestPage: React.FC = () => {
  const [transactionType, setTransactionType] = useState<'GRN' | 'DISPATCH' | 'TRANSFER' | 'ADJUSTMENT'>('GRN');
  const [transactionId, setTransactionId] = useState('');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [warehouseId, setWarehouseId] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const handleUpload = async () => {
    if (!transactionId || !warehouseId || !files || files.length === 0) {
      setErr('transactionId, warehouseId and files required');
      return;
    }
    setErr('');
    setMsg('');
    const formData = new FormData();
    formData.append('transactionType', transactionType);
    formData.append('transactionId', transactionId);
    formData.append('direction', direction);
    formData.append('warehouseId', warehouseId);
    Array.from(files).forEach((f) => formData.append('files', f));

    try {
      const res = await api.post('/inventory-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMsg(`Uploaded: ${res.data.media?.length || 0} file(s)`);
    } catch (error: any) {
      setErr(error?.response?.data?.message || 'Failed to upload');
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>Media Upload Test</h1>
      <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
        Use this to attach photo/video proof to any GRN or Dispatch transaction. Enter the transaction ID you got after creating GRN/Dispatch.
      </p>

      <div
        style={{
          padding: 12,
          borderRadius: 8,
          border: '1px solid #1e293b',
          maxWidth: 520
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select
            value={transactionType}
            onChange={(e) =>
              setTransactionType(e.target.value as 'GRN' | 'DISPATCH' | 'TRANSFER' | 'ADJUSTMENT')
            }
            style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #334155' }}
          >
            <option value="GRN">GRN</option>
            <option value="DISPATCH">Dispatch</option>
            <option value="TRANSFER">Transfer</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </select>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as 'IN' | 'OUT')}
            style={{ width: 120, padding: 6, borderRadius: 6, border: '1px solid #334155' }}
          >
            <option value="IN">IN</option>
            <option value="OUT">OUT</option>
          </select>
        </div>

        <input
          placeholder="Transaction ID (e.g. GRN _id)"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          style={{
            width: '100%',
            padding: 6,
            borderRadius: 6,
            border: '1px solid #334155',
            marginBottom: 8
          }}
        />
        <input
          placeholder="Warehouse ID"
          value={warehouseId}
          onChange={(e) => setWarehouseId(e.target.value)}
          style={{
            width: '100%',
            padding: 6,
            borderRadius: 6,
            border: '1px solid #334155',
            marginBottom: 8
          }}
        />

        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          style={{ marginBottom: 8 }}
        />

        <button
          onClick={handleUpload}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: 'none',
            background: '#22c55e',
            color: '#020617',
            fontWeight: 600,
            fontSize: 13
          }}
        >
          Upload
        </button>

        {msg && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#22c55e' }}>
            {msg}
          </div>
        )}
        {err && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#f97316' }}>
            {err}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaTestPage;
