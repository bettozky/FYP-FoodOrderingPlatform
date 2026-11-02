import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "../modules/auth/AuthContext";
import LoginPage from "../modules/auth/LoginPage";
import Layout from "./Layout";
import DashboardPage from "../modules/dashboard/DashboardPage";
import MerchantsPage from "../modules/merchants/MerchantsPage";
import OrdersPage from "../modules/orders/OrdersPage";
import WatchlistPage from "../modules/watchlist/WatchlistPage";
import ReviewsPage from "../modules/reviews/ReviewsPage";
import CustomersPage from "../modules/customers/CustomersPage";
import ReservationsPage from "../modules/reservations/ReservationsPage";
import VouchersPage from "../modules/vouchers/VouchersPage";
import AnnouncementsPage from "../modules/announcements/AnnouncementsPage";
import ActivityPage from "../modules/activity/ActivityPage";

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
          <Route path="reservations" element={<ReservationsPage />} />
          <Route path="watchlist" element={<WatchlistPage />} />
          <Route path="reviews" element={<ReviewsPage />} />
          <Route path="users" element={<CustomersPage />} />
          <Route path="vouchers" element={<VouchersPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="activity" element={<ActivityPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
