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
import SalesInvoicePage from './pages/SalesInvoicePage';
import SalesInvoicesListPage from './pages/SalesInvoicesListPage';
import ReceiptsListPage from './pages/ReceiptsListPage';
import ReceiptPage from './pages/ReceiptPage';
import SalesReturnsListPage from "./pages/SalesReturnsListPage";
import SalesReturnPage from "./pages/SalesReturnPage";
import ReportsHomePage from "./pages/ReportsHomePage";
import OutstandingReportPage from "./pages/OutstandingReportPage";
import CustomerLedgerPage from "./pages/CustomerLedgerPage";
import DailySummaryPage from "./pages/DailySummaryPage";

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
<Route path="/sales/invoices" element={<SalesInvoicesListPage />} />
<Route path="/sales/new" element={<SalesInvoicePage />} />
<Route path="/sales/receipts" element={<ReceiptsListPage />} />
<Route path="/sales/receipts/new" element={<ReceiptPage />} />
<Route path="/sales/returns" element={<SalesReturnsListPage />} />
<Route path="/sales/returns/new" element={<SalesReturnPage />} />
<Route path="/sales/reports" element={<ReportsHomePage />} />
<Route path="/sales/reports/outstanding" element={<OutstandingReportPage />} />
<Route path="/sales/reports/ledger" element={<CustomerLedgerPage />} />
<Route path="/sales/reports/daily" element={<DailySummaryPage />} />

              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default App;
