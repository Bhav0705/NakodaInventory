import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Dashboard</h1>
      <p style={{ marginBottom: 8 }}>
        Welcome, <strong>{user?.name}</strong>.
      </p>
      <p style={{ marginBottom: 16 }}>
        Role: <strong>{user?.role}</strong>
      </p>
      <p style={{ opacity: 0.8, fontSize: 14 }}>
        Use the left navigation to manage warehouses, products, and inventory movements (GRN & Dispatch).
      </p>
    </div>
  );
};

export default DashboardPage;
