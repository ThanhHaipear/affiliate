import React from "react";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  createMemoryRouter,
  useLocation,
  useParams,
} from "react-router-dom";
import { AuthGuard, GuestGuard, RoleGuard } from "../lib/guards";
import { resolveDashboardRole, useAuthStore } from "../store/authStore";
import DashboardLayout from "../components/layout/DashboardLayout";
import MainLayout from "../components/layout/MainLayout";
import UnauthorizedPage from "../pages/shared/UnauthorizedPage";
import NotFoundPage from "../pages/shared/NotFoundPage";
import VnpayReturnPage from "../pages/shared/VnpayReturnPage";
import HomePage from "../pages/public/HomePage";
import ProductListPage from "../pages/public/ProductListPage";
import ProductDetailPage from "../pages/public/ProductDetailPage";
import PublicShopPage from "../pages/public/PublicShopPage";
import AboutPage from "../pages/public/AboutPage";
import PolicyPage from "../pages/public/PolicyPage";
import ContactPage from "../pages/public/ContactPage";
import FaqPage from "../pages/public/FaqPage";
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import RegisterCustomerPage from "../pages/auth/RegisterCustomerPage";
import RegisterSellerPage from "../pages/auth/RegisterSellerPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";
import CustomerProfilePage from "../pages/dashboard/customer/CustomerProfilePage";
import CartPage from "../pages/dashboard/customer/CartPage";
import CheckoutPage from "../pages/dashboard/customer/CheckoutPage";
import MyOrdersPage from "../pages/dashboard/customer/MyOrdersPage";
import OrderDetailPage from "../pages/dashboard/customer/OrderDetailPage";
import CustomerAddressPage from "../pages/dashboard/customer/CustomerAddressPage";
import CustomerChangePasswordPage from "../pages/dashboard/customer/CustomerChangePasswordPage";
import CustomerNotificationsPage from "../pages/dashboard/customer/CustomerNotificationsPage";
import CustomerWishlistPage from "../pages/dashboard/customer/CustomerWishlistPage";
import CustomerAffiliatePage from "../pages/dashboard/customer/CustomerAffiliatePage";
import SellerOverviewPage from "../pages/dashboard/seller/SellerOverviewPage";
import SellerShopPage from "../pages/dashboard/seller/SellerShopPage";
import SellerProductsPage from "../pages/dashboard/seller/SellerProductsPage";
import SellerCreateProductPage from "../pages/dashboard/seller/SellerCreateProductPage";
import SellerProductDetailPage from "../pages/dashboard/seller/SellerProductDetailPage";
import SellerEditProductPage from "../pages/dashboard/seller/SellerEditProductPage";
import SellerOrdersPage from "../pages/dashboard/seller/SellerOrdersPage";
import SellerOrderDetailPage from "../pages/dashboard/seller/SellerOrderDetailPage";
import SellerWithdrawalsPage from "../pages/dashboard/seller/SellerWithdrawalsPage";
import SellerRevenuePage from "../pages/dashboard/seller/SellerRevenuePage";
import SellerChangePasswordPage from "../pages/dashboard/seller/SellerChangePasswordPage";
import SellerNotificationsPage from "../pages/dashboard/seller/SellerNotificationsPage";
import SellerAffiliatesPage from "../pages/dashboard/seller/SellerAffiliatesPage";
import AffiliateOverviewPage from "../pages/dashboard/affiliate/AffiliateOverviewPage";
import AffiliateProfilePage from "../pages/dashboard/affiliate/AffiliateProfilePage";
import AffiliateMarketplacePage from "../pages/dashboard/affiliate/AffiliateMarketplacePage";
import AffiliateProductDetailPage from "../pages/dashboard/affiliate/AffiliateProductDetailPage";
import AffiliateLinksPage from "../pages/dashboard/affiliate/AffiliateLinksPage";
import AffiliateCommissionsPage from "../pages/dashboard/affiliate/AffiliateCommissionsPage";
import AffiliateWithdrawalsPage from "../pages/dashboard/affiliate/AffiliateWithdrawalsPage";
import AffiliateNotificationsPage from "../pages/dashboard/affiliate/AffiliateNotificationsPage";
import AffiliateChangePasswordPage from "../pages/dashboard/affiliate/AffiliateChangePasswordPage";
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import AdminCategoriesPage from "../pages/admin/AdminCategoriesPage";
import AdminAccountsPage from "../pages/admin/AdminAccountsPage";
import AdminPendingSellersPage from "../pages/admin/AdminPendingSellersPage";
import AdminSellerDetailPage from "../pages/admin/AdminSellerDetailPage";
import AdminPendingAffiliatesPage from "../pages/admin/AdminPendingAffiliatesPage";
import AdminAffiliateDetailPage from "../pages/admin/AdminAffiliateDetailPage";
import AdminPendingProductsPage from "../pages/admin/AdminPendingProductsPage";
import AdminProductDetailPage from "../pages/admin/AdminProductDetailPage";
import AdminProductsManagementPage from "../pages/admin/AdminProductsManagementPage";
import AdminAffiliateLinksPage from "../pages/admin/AdminAffiliateLinksPage";
import AdminOrdersPage from "../pages/admin/AdminOrdersPage";
import AdminCommissionsPage from "../pages/admin/AdminCommissionsPage";
import AdminPendingWithdrawalsPage from "../pages/admin/AdminPendingWithdrawalsPage";
import AdminFraudDetectionPage from "../pages/admin/AdminFraudDetectionPage";
import AdminSettingsPage from "../pages/admin/AdminSettingsPage";
import AdminNotificationsPage from "../pages/admin/AdminNotificationsPage";
import AdminAppealsPage from "../pages/admin/AdminAppealsPage";

function AppShell() {
  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <Outlet />
    </div>
  );
}

function AuthLayout() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_55%,#f0fdf4_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-sky-200 bg-[linear-gradient(180deg,#0f172a_0%,#16324f_100%)] p-8 text-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
          <p className="text-xs uppercase tracking-[0.32em] text-sky-200">Affiliate commerce</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Đăng ký tài khoản để mua hàng và kích hoạt thêm vai trò tiếp thị khi cần.</h1>
          <p className="mt-5 text-sm leading-7 text-slate-200">
            Giao diện auth được tách riêng để người dùng nhập thông tin dễ đọc, dễ quét và không bị rối.
          </p>
          <div className="mt-8 space-y-4">
            {[
              "Customer mua hàng, quản lý giỏ và theo dõi đơn hàng.",
              "Affiliate được kích hoạt thêm trên chính tài khoản customer khi người dùng có nhu cầu.",
              "Seller đăng ký ở luồng riêng và chờ admin phê duyệt trước khi vận hành.",
            ].map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-white/10 p-4 text-sm leading-7 text-slate-100">
                {item}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-300 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

function DashboardRedirect() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const roles = useAuthStore((state) => state.roles);
  const activeDashboardRole = useAuthStore((state) => state.activeDashboardRole);
  const primaryRole = resolveDashboardRole(currentUser, roles, activeDashboardRole);

  if (!primaryRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (primaryRole === "customer") {
    return <Navigate to="/dashboard/customer/profile" replace />;
  }

  if (primaryRole === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Navigate to={`/dashboard/${primaryRole}`} replace />;
}

function CustomerOrderAliasRedirect() {
  const { orderId } = useParams();
  return <Navigate to={`/dashboard/customer/orders/${orderId}`} replace />;
}

function CustomerProductAliasRedirect() {
  const { productId } = useParams();
  return <Navigate to={`/products/${productId}`} replace />;
}

function AffiliateProductAliasRedirect() {
  const { productId } = useParams();
  return <Navigate to={`/dashboard/affiliate/products/${productId}`} replace />;
}

function SellerEditProductAliasRedirect() {
  const { productId } = useParams();
  return <Navigate to={`/dashboard/seller/products/${productId}/edit`} replace />;
}

function SellerProductAliasRedirect() {
  const { productId } = useParams();
  return <Navigate to={`/dashboard/seller/products/${productId}`} replace />;
}

function SellerOrderAliasRedirect() {
  const { orderId } = useParams();
  return <Navigate to={`/dashboard/seller/orders/${orderId}`} replace />;
}

function AdminPlatformFeesRedirect() {
  const location = useLocation();
  return <Navigate to={`/admin/settings${location.search || ""}`} replace />;
}

const routes = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: <HomePage /> },
          { path: "products", element: <ProductListPage /> },
          { path: "products/:productId", element: <ProductDetailPage /> },
          { path: "shops/:sellerId", element: <PublicShopPage /> },
          { path: "about", element: <AboutPage /> },
          { path: "policy", element: <PolicyPage /> },
          { path: "policies", element: <PolicyPage /> },
          { path: "contact", element: <ContactPage /> },
          { path: "faq", element: <FaqPage /> },
        ],
      },
      { path: "login", element: <Navigate to="/auth/login" replace /> },
      { path: "register", element: <Navigate to="/auth/register" replace /> },
      {
        path: "auth",
        element: (
          <GuestGuard>
            <AuthLayout />
          </GuestGuard>
        ),
        children: [
          { index: true, element: <Navigate to="/auth/login" replace /> },
          { path: "login", element: <LoginPage /> },
          { path: "register", element: <RegisterPage /> },
          { path: "register/customer", element: <RegisterCustomerPage /> },
          { path: "register/seller", element: <RegisterSellerPage /> },
          { path: "register/affiliate", element: <Navigate to="/auth/register/customer" replace /> },
          { path: "forgot-password", element: <ForgotPasswordPage /> },
          { path: "reset-password", element: <ResetPasswordPage /> },
        ],
      },
      {
        path: "dashboard",
        element: (
          <AuthGuard>
            <DashboardLayout />
          </AuthGuard>
        ),
        children: [
          { index: true, element: <DashboardRedirect /> },
          {
            path: "customer",
            element: (
              <RoleGuard allowedRoles={["customer"]}>
                <Outlet />
              </RoleGuard>
            ),
            children: [
              { index: true, element: <Navigate to="/dashboard/customer/profile" replace /> },
              { path: "profile", element: <CustomerProfilePage /> },
              { path: "address", element: <CustomerAddressPage /> },
              { path: "change-password", element: <CustomerChangePasswordPage /> },
              { path: "notifications", element: <CustomerNotificationsPage /> },
              { path: "wishlist", element: <CustomerWishlistPage /> },
              { path: "affiliate", element: <CustomerAffiliatePage /> },
              { path: "cart", element: <CartPage /> },
              { path: "checkout", element: <CheckoutPage /> },
              { path: "orders", element: <MyOrdersPage /> },
              { path: "orders/:orderId", element: <OrderDetailPage /> },
            ],
          },
          {
            path: "seller",
            element: (
              <RoleGuard allowedRoles={["seller"]}>
                <Outlet />
              </RoleGuard>
            ),
            children: [
              { index: true, element: <SellerOverviewPage /> },
              { path: "shop", element: <SellerShopPage /> },
              { path: "profile", element: <Navigate to="/dashboard/seller/shop" replace /> },
              { path: "products", element: <SellerProductsPage /> },
              { path: "products/create", element: <SellerCreateProductPage /> },
              { path: "products/:productId", element: <SellerProductDetailPage /> },
              { path: "products/:productId/edit", element: <SellerEditProductPage /> },
              { path: "affiliate-settings", element: <Navigate to="/dashboard/seller/products" replace /> },
              { path: "orders", element: <SellerOrdersPage /> },
              { path: "orders/:orderId", element: <SellerOrderDetailPage /> },
              { path: "revenue", element: <SellerRevenuePage /> },
              { path: "payments", element: <Navigate to="/dashboard/seller/withdrawals" replace /> },
              { path: "wallet", element: <Navigate to="/dashboard/seller/withdrawals" replace /> },
              { path: "withdrawals", element: <SellerWithdrawalsPage /> },
              { path: "affiliates", element: <SellerAffiliatesPage /> },
              { path: "change-password", element: <SellerChangePasswordPage /> },
              { path: "notifications", element: <SellerNotificationsPage /> },
            ],
          },
          {
            path: "affiliate",
            element: (
              <RoleGuard allowedRoles={["affiliate"]}>
                <Outlet />
              </RoleGuard>
            ),
            children: [
              { index: true, element: <AffiliateOverviewPage /> },
              { path: "profile", element: <AffiliateProfilePage /> },
              { path: "marketplace", element: <AffiliateMarketplacePage /> },
              { path: "products/:productId", element: <AffiliateProductDetailPage /> },
              { path: "links", element: <AffiliateLinksPage /> },
              { path: "commissions", element: <AffiliateCommissionsPage /> },
              { path: "wallet", element: <Navigate to="/dashboard/affiliate/withdrawals" replace /> },
              { path: "withdrawals", element: <AffiliateWithdrawalsPage /> },
              { path: "withdraw-history", element: <Navigate to="/dashboard/affiliate/withdrawals" replace /> },
              { path: "payment-accounts", element: <Navigate to="/dashboard/affiliate/profile" replace /> },
              { path: "notifications", element: <AffiliateNotificationsPage /> },
              { path: "change-password", element: <AffiliateChangePasswordPage /> },
            ],
          },
          {
            path: "admin",
            element: (
              <RoleGuard allowedRoles={["admin"]}>
                <Navigate to="/admin/dashboard" replace />
              </RoleGuard>
            ),
          },
          {
            path: "admin/*",
            element: (
              <RoleGuard allowedRoles={["admin"]}>
                <Navigate to="/admin/dashboard" replace />
              </RoleGuard>
            ),
          },
        ],
      },
      {
        path: "admin",
        element: (
          <AuthGuard>
            <RoleGuard allowedRoles={["admin"]}>
              <AdminLayout />
            </RoleGuard>
          </AuthGuard>
        ),
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: "dashboard", element: <AdminDashboardPage /> },
          { path: "categories", element: <AdminCategoriesPage /> },
          { path: "products", element: <AdminProductsManagementPage /> },
          { path: "affiliate-links", element: <AdminAffiliateLinksPage /> },
          { path: "accounts", element: <AdminAccountsPage /> },
          { path: "sellers/pending", element: <AdminPendingSellersPage /> },
          { path: "sellers/:id", element: <AdminSellerDetailPage /> },
          { path: "affiliates/pending", element: <AdminPendingAffiliatesPage /> },
          { path: "affiliates/:id", element: <AdminAffiliateDetailPage /> },
          { path: "products/pending", element: <AdminPendingProductsPage /> },
          { path: "products/:id", element: <AdminProductDetailPage /> },
          { path: "orders", element: <AdminOrdersPage /> },
          { path: "notifications", element: <AdminNotificationsPage /> },
          { path: "platform-fees", element: <AdminPlatformFeesRedirect /> },
          { path: "commissions", element: <AdminCommissionsPage /> },
          { path: "withdrawals/pending", element: <AdminPendingWithdrawalsPage /> },
          { path: "fraud-detection", element: <AdminFraudDetectionPage /> },
          { path: "settings", element: <AdminSettingsPage /> },
          { path: "appeals", element: <AdminAppealsPage /> },
        ],
      },
      { path: "cart", element: <Navigate to="/dashboard/customer/cart" replace /> },
      { path: "checkout", element: <Navigate to="/dashboard/customer/checkout" replace /> },
      { path: "account", element: <Navigate to="/dashboard/customer/profile" replace /> },
      { path: "account/cart", element: <Navigate to="/dashboard/customer/cart" replace /> },
      { path: "account/checkout", element: <Navigate to="/dashboard/customer/checkout" replace /> },
      { path: "account/orders", element: <Navigate to="/dashboard/customer/orders" replace /> },
      { path: "account/orders/:orderId", element: <CustomerOrderAliasRedirect /> },
      { path: "account/profile", element: <Navigate to="/dashboard/customer/profile" replace /> },
      { path: "account/address", element: <Navigate to="/dashboard/customer/address" replace /> },
      { path: "account/change-password", element: <Navigate to="/dashboard/customer/change-password" replace /> },
      { path: "customer", element: <Navigate to="/dashboard/customer/profile" replace /> },
      { path: "customer/notifications", element: <Navigate to="/dashboard/customer/notifications" replace /> },
      { path: "customer/wishlist", element: <Navigate to="/dashboard/customer/wishlist" replace /> },
      { path: "customer/products", element: <Navigate to="/products" replace /> },
      { path: "customer/products/:productId", element: <CustomerProductAliasRedirect /> },
      { path: "affiliate/dashboard", element: <Navigate to="/dashboard/affiliate" replace /> },
      { path: "affiliate/products", element: <Navigate to="/dashboard/affiliate/marketplace" replace /> },
      { path: "affiliate/products/:productId", element: <AffiliateProductAliasRedirect /> },
      { path: "affiliate/links", element: <Navigate to="/dashboard/affiliate/links" replace /> },
      { path: "affiliate/commissions", element: <Navigate to="/dashboard/affiliate/commissions" replace /> },
      { path: "affiliate/withdraw", element: <Navigate to="/dashboard/affiliate/withdrawals" replace /> },
      { path: "affiliate/withdraw-history", element: <Navigate to="/dashboard/affiliate/withdrawals" replace /> },
      { path: "affiliate/profile", element: <Navigate to="/dashboard/affiliate/profile" replace /> },
      { path: "affiliate/payment-accounts", element: <Navigate to="/dashboard/affiliate/profile" replace /> },
      { path: "affiliate/notifications", element: <Navigate to="/dashboard/affiliate/notifications" replace /> },
      { path: "affiliate/change-password", element: <Navigate to="/dashboard/affiliate/change-password" replace /> },
      { path: "seller/dashboard", element: <Navigate to="/dashboard/seller" replace /> },
      { path: "seller/shop", element: <Navigate to="/dashboard/seller/shop" replace /> },
      { path: "seller/products", element: <Navigate to="/dashboard/seller/products" replace /> },
      { path: "seller/products/new", element: <Navigate to="/dashboard/seller/products/create" replace /> },
      { path: "seller/products/:productId", element: <SellerProductAliasRedirect /> },
      { path: "seller/products/:productId/edit", element: <SellerEditProductAliasRedirect /> },
      { path: "seller/orders", element: <Navigate to="/dashboard/seller/orders" replace /> },
      { path: "seller/orders/:orderId", element: <SellerOrderAliasRedirect /> },
      { path: "seller/revenue", element: <Navigate to="/dashboard/seller/revenue" replace /> },
      { path: "seller/withdraw", element: <Navigate to="/dashboard/seller/withdrawals" replace /> },
      { path: "seller/wallet", element: <Navigate to="/dashboard/seller/withdrawals" replace /> },
      { path: "seller/payments", element: <Navigate to="/dashboard/seller/withdrawals" replace /> },
      { path: "seller/profile", element: <Navigate to="/dashboard/seller/shop" replace /> },
      { path: "seller/change-password", element: <Navigate to="/dashboard/seller/change-password" replace /> },
      { path: "seller/notifications", element: <Navigate to="/dashboard/seller/notifications" replace /> },
      { path: "payment/vnpay-return", element: <VnpayReturnPage /> },
      { path: "unauthorized", element: <UnauthorizedPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

function createAppRouter(options) {
  return createBrowserRouter(routes, options);
}

function createTestRouter(initialEntries = ["/"]) {
  return createMemoryRouter(routes, { initialEntries });
}

const router = createAppRouter();

function AppRouter() {
  return <RouterProvider router={router} />;
}

export { AppRouter, createAppRouter, createTestRouter, router, routes };







