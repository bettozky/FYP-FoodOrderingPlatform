import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../modules/auth/AuthContext";
import LoginPage from "../modules/auth/LoginPage";
import Layout from "./Layout";
import DashboardPage from "../modules/dashboard/DashboardPage";
import MerchantsPage from "../modules/merchants/MerchantsPage";
import OrdersPage from "../modules/orders/OrdersPage";

function Protected({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
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
          <Route path="orders" element={<OrdersPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
