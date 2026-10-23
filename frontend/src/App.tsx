import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { AppLayout } from "./layout/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// App pages are code-split so the landing/login load fast (the full bundle is >2 MB).
const PlanPage = lazy(() => import("./pages/PlanPage").then((m) => ({ default: m.PlanPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const InventoryPage = lazy(() => import("./pages/InventoryPage").then((m) => ({ default: m.InventoryPage })));
const SalesPage = lazy(() => import("./pages/SalesPage").then((m) => ({ default: m.SalesPage })));
const TransfersPage = lazy(() => import("./pages/TransfersPage").then((m) => ({ default: m.TransfersPage })));
const BranchesPage = lazy(() => import("./pages/BranchesPage").then((m) => ({ default: m.BranchesPage })));
const UsersPage = lazy(() => import("./pages/UsersPage").then((m) => ({ default: m.UsersPage })));
const ReportsPage = lazy(() => import("./pages/reports/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import("./pages/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const AccountsPage = lazy(() => import("./pages/accounts/AccountsPage").then((m) => ({ default: m.AccountsPage })));
const CustomersPage = lazy(() => import("./pages/customers/CustomersPage"));
const SuppliersPage = lazy(() => import("./pages/suppliers/SuppliersPage"));
const DocumentsPage = lazy(() => import("./pages/documents/DocumentsPage"));
const PurchaseOrdersPage = lazy(() => import("./pages/purchases/PurchaseOrdersPage"));
const EmployeesPage = lazy(() => import("./pages/employees/EmployeesPage"));
const PayrollPage = lazy(() => import("./pages/payroll/PayrollPage"));
const AccountingPage = lazy(() => import("./pages/accounting/AccountingPage"));
const AuditPage = lazy(() => import("./pages/audit/AuditPage"));
const PromotionsPage = lazy(() => import("./pages/promotions/PromotionsPage"));

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <ToastProvider>
      <Suspense fallback={<div className="min-h-screen bg-slate-50 dark:bg-slate-900" />}>
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
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="accounting" element={<AccountingPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
