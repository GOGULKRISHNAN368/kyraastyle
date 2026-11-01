import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import AdminLayout from '../components/layout/AdminLayout.jsx';
import PagePlaceholder from '../components/layout/PagePlaceholder.jsx';
import UiKitPage from '../pages/UiKitPage.jsx';
import ProductsPage from '../pages/ProductsPage.jsx';
import CategoriesPage from '../pages/CategoriesPage.jsx';
import CouponsPage from '../pages/CouponsPage.jsx';
import ReelsPage from '../pages/ReelsPage.jsx';
import InstagramPage from '../pages/InstagramPage.jsx';
import LeadsPage from '../pages/LeadsPage.jsx';
import OrdersPage from '../pages/OrdersPage.jsx';
import AnnouncementsPage from '../pages/AnnouncementsPage.jsx';

function LoginRoute() {
  const { user, loading } = useAuth();
  if (import.meta.env.DEV) return <Navigate to="/dashboard" replace />;
  if (loading) return <div className="session-loading" role="status">Checking session…</div>;
  return user ? <Navigate to="/dashboard" replace /> : <LoginPage />;
}

export default function AppRoutes() {
  return <Routes>
    <Route path="/login" element={<LoginRoute />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<AdminLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/coupons" element={<CouponsPage />} />
        <Route path="/reels" element={<ReelsPage />} />
        <Route path="/instagram" element={<InstagramPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/completed-orders" element={<OrdersPage mode="completed" />} />
        <Route path="/cancelled-orders" element={<OrdersPage mode="cancelled" />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/media" element={<PagePlaceholder title="Media Library" />} />
        <Route path="/reviews" element={<PagePlaceholder title="Reviews" />} />
        <Route path="/enquiries" element={<PagePlaceholder title="Enquiries" />} />
        <Route path="/site-sections" element={<PagePlaceholder title="Site Sections" />} />
        <Route path="/settings" element={<PagePlaceholder title="Settings" />} />
        <Route path="/admin-users" element={<PagePlaceholder title="Admin Users" />} />
        <Route path="/ui-kit" element={<UiKitPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
