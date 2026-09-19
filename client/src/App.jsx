import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import StoreLayout from './components/StoreLayout';
import { Loader, RequireAdmin, RequireAuth } from './components/Guards';
import Home from './pages/Home';
import Designs from './pages/Designs';
import DesignPage from './pages/DesignPage';
import Categories from './pages/Categories';
import Packages from './pages/Packages';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import MyDownloads from './pages/MyDownloads';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';
import Account from './pages/Account';
import { ForgotPassword, ResetPassword } from './pages/PasswordPages';
import Policies from './pages/Policies';
import NotFound from './pages/NotFound';
// Admin pages load only when an admin opens them
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const AdminDesigns = lazy(() => import('./admin/Designs'));
const DesignForm = lazy(() => import('./admin/DesignForm'));
const AdminCategories = lazy(() => import('./admin/Categories'));
const AdminPackages = lazy(() => import('./admin/Packages'));
const AdminOrders = lazy(() => import('./admin/Orders'));
const AdminOrderDetail = lazy(() => import('./admin/OrderDetail'));
const AdminUsers = lazy(() => import('./admin/Users'));
const AdminUserDetail = lazy(() => import('./admin/UserDetail'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="designs" element={<Designs />} />
          <Route path="free-designs" element={<Designs free />} />
          <Route path="design/:code" element={<DesignPage />} />
          <Route path="categories" element={<Categories />} />
          <Route path="packages" element={<Packages />} />
          <Route path="cart" element={<Cart />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="policies" element={<Policies />} />
          <Route element={<RequireAuth />}>
            <Route path="checkout" element={<Checkout />} />
            <Route path="downloads" element={<MyDownloads />} />
            <Route path="orders" element={<MyOrders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="account" element={<Account />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="admin" element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="designs" element={<AdminDesigns />} />
            <Route path="designs/new" element={<DesignForm />} />
            <Route path="designs/:id" element={<DesignForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetail />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
          </Route>
        </Route>
      </Routes>
      </Suspense>
    </>
  );
}
