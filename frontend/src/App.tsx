import { Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { PlanPage } from "./pages/PlanPage";
import { AppLayout } from "./layout/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { InventoryPage } from "./pages/InventoryPage";
import { SalesPage } from "./pages/SalesPage";
import { TransfersPage } from "./pages/TransfersPage";
import { BranchesPage } from "./pages/BranchesPage";
import { UsersPage } from "./pages/UsersPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { SettingsPage } from "./pages/settings/SettingsPage";
import CustomersPage from "./pages/customers/CustomersPage";
import SuppliersPage from "./pages/suppliers/SuppliersPage";
import DocumentsPage from "./pages/documents/DocumentsPage";
import PurchaseOrdersPage from "./pages/purchases/PurchaseOrdersPage";
import { AccountsPage } from "./pages/accounts/AccountsPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <ToastProvider>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AuthProvider>
              <AppLayout />
            </AuthProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="transfers" element={<TransfersPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="plan" element={<PlanPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<SuppliersPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="purchases" element={<PurchaseOrdersPage />} />
        <Route path="accounts" element={<AccountsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
