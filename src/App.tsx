import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import WarehousesPage from './pages/WarehousesPage';
import ProductsPage from './pages/ProductsPage';
import GRNPage from './pages/GRNPage';
import DispatchPage from './pages/DispatchPage';
import MediaTestPage from './pages/MediaTestPage';
import LoginPage from './pages/LoginPage';
import UsersPage from './pages/UsersPage';
import StockPage from './pages/StockPage';
import TransferPage from './pages/TransferPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/warehouses" element={<WarehousesPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/grn" element={<GRNPage />} />
                <Route path="/dispatch" element={<DispatchPage />} />
                <Route path="/media-test" element={<MediaTestPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/transfer" element={<TransferPage />} />


              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
