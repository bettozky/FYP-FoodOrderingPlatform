import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../modules/auth/AuthContext";
import LoginPage from "../modules/auth/LoginPage";
import Layout from "./Layout";
import DashboardPage from "../modules/dashboard/DashboardPage";
import MerchantsPage from "../modules/merchants/MerchantsPage";
import UsersPage from "../modules/users/UsersPage";
import OrdersPage from "../modules/orders/OrdersPage";
import DisputesPage from "../modules/disputes/DisputesPage";
import ModerationPage from "../modules/moderation/ModerationPage";
import AnalyticsPage from "../modules/analytics/AnalyticsPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, checking } = useAuth();
  if (checking) return <p className="muted" style={{ padding: 28 }}>Loading…</p>;
  return isLoggedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="merchants" element={<MerchantsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="disputes" element={<DisputesPage />} />
          <Route path="moderation" element={<ModerationPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
