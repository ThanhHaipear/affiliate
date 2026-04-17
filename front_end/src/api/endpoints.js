const API_PREFIX = "/api";

const ENDPOINTS = {
  auth: {
    register: `${API_PREFIX}/auth/register`,
    login: `${API_PREFIX}/auth/login`,
    logout: `${API_PREFIX}/auth/logout`,
    refreshToken: `${API_PREFIX}/auth/refresh-token`,
    forgotPassword: `${API_PREFIX}/auth/forgot-password`,
    verifyResetPasswordToken: `${API_PREFIX}/auth/reset-password/verify`,
    resetPassword: `${API_PREFIX}/auth/reset-password`,
    changePassword: `${API_PREFIX}/auth/change-password`,
    enrollAffiliate: `${API_PREFIX}/auth/enroll-affiliate`,
  },
  users: {
    profile: `${API_PREFIX}/users/profile`,
  },
  admin: {
    dashboard: `${API_PREFIX}/admin/dashboard`,
    accounts: `${API_PREFIX}/admin/accounts`,
    accountLock: (userId) => `${API_PREFIX}/admin/accounts/${userId}/lock`,
    accountUnlock: (userId) => `${API_PREFIX}/admin/accounts/${userId}/unlock`,
    sellerReview: (sellerId) => `${API_PREFIX}/admin/sellers/${sellerId}/review`,
    affiliateReview: (affiliateId) => `${API_PREFIX}/admin/affiliates/${affiliateId}/review`,
    productReview: (productId) => `${API_PREFIX}/admin/products/${productId}/review`,
    productAffiliateReview: (settingId) => `${API_PREFIX}/admin/product-affiliate-settings/${settingId}/review`,
    orders: `${API_PREFIX}/admin/orders`,
    financialStats: `${API_PREFIX}/admin/financial-stats`,
    settings: `${API_PREFIX}/admin/settings`,
    platformFee: `${API_PREFIX}/admin/settings/platform-fee`,
    withdrawalConfig: `${API_PREFIX}/admin/settings/withdrawal-config`,
    refundsReview: (refundId) => `${API_PREFIX}/admin/refunds/${refundId}/review`,
    fraudAlerts: `${API_PREFIX}/admin/fraud-alerts`,
  },
  seller: {
    profile: `${API_PREFIX}/seller/profile`,
    stats: `${API_PREFIX}/seller/stats`,
    orders: `${API_PREFIX}/seller/orders`,
    products: `${API_PREFIX}/seller/products`,
    productDetail: (productId) => `${API_PREFIX}/seller/products/${productId}`,
    productAffiliateSetting: (productId) => `${API_PREFIX}/seller/products/${productId}/affiliate-setting`,
    affiliateSettings: `${API_PREFIX}/seller/affiliate-settings`,
  },
  affiliate: {
    stats: `${API_PREFIX}/affiliate/stats`,
    profile: `${API_PREFIX}/affiliate/profile`,
    channels: `${API_PREFIX}/affiliate/channels`,
    paymentAccounts: `${API_PREFIX}/affiliate/payment-accounts`,
  },
  products: {
    list: `${API_PREFIX}/products`,
    detail: (productId) => `${API_PREFIX}/products/${productId}`,
    reviews: (productId) => `${API_PREFIX}/products/${productId}/reviews`,
  },
  orders: {
    list: `${API_PREFIX}/orders`,
    detail: (orderId) => `${API_PREFIX}/orders/${orderId}`,
  },
  cart: {
    root: `${API_PREFIX}/cart`,
    items: `${API_PREFIX}/cart/items`,
    itemDetail: (itemId) => `${API_PREFIX}/cart/items/${itemId}`,
    checkout: `${API_PREFIX}/cart/checkout`,
  },
  payments: {
    cancel: (orderId) => `${API_PREFIX}/payments/${orderId}/cancel`,
    refund: (orderId) => `${API_PREFIX}/payments/${orderId}/refund`,
    sellerCancel: (orderId) => `${API_PREFIX}/payments/${orderId}/seller-cancel`,
    sellerConfirm: (orderId) => `${API_PREFIX}/payments/${orderId}/seller-confirm`,
    paymentMethod: (orderId) => `${API_PREFIX}/payments/${orderId}/payment-method`,
    vnpayUrl: (orderId) => `${API_PREFIX}/payments/${orderId}/vnpay-url`,
    vnpayReturnConfirm: `${API_PREFIX}/payments/vnpay-return/confirm`,
  },
  tracking: {
    links: `${API_PREFIX}/tracking/links`,
    linkRevoke: (linkId) => `${API_PREFIX}/tracking/links/${linkId}/revoke`,
  },
  commissions: {
    me: `${API_PREFIX}/commissions/me`,
  },
  uploads: {
    images: `${API_PREFIX}/uploads/images`,
  },
  notifications: {
    list: `${API_PREFIX}/notifications`,
    read: (notificationId) => `${API_PREFIX}/notifications/${notificationId}/read`,
    readAll: `${API_PREFIX}/notifications/read-all`,
  },
  wallets: {
    me: `${API_PREFIX}/wallets/me`,
  },
  withdrawals: {
    create: `${API_PREFIX}/withdrawals`,
    me: `${API_PREFIX}/withdrawals/me`,
    context: `${API_PREFIX}/withdrawals/me/context`,
    pendingList: `${API_PREFIX}/withdrawals/pending/list`,
    adminList: `${API_PREFIX}/withdrawals/admin/list`,
    adminSummary: `${API_PREFIX}/withdrawals/admin/summary`,
    review: (withdrawalId) => `${API_PREFIX}/withdrawals/${withdrawalId}/review`,
  },
  payoutBatches: {
    list: `${API_PREFIX}/payout-batches`,
  },
};

export { API_PREFIX, ENDPOINTS };
