const adminDashboardMock = {
  total_users: 1240,
  total_sellers: 86,
  total_affiliates: 214,
  total_customers: 940,
  pending_seller_approvals: 7,
  pending_affiliate_approvals: 11,
  pending_product_approvals: 13,
  gross_merchandise_value: 482000000,
  platform_revenue: 24100000,
  fraud_alerts: 4,
};

const sellerDashboardMock = {
  revenue: 128500000,
  wallet_balance: 25600000,
  total_products: 14,
  approved_products: 9,
  total_orders: 182,
  processing_orders: 12,
  pending_affiliate_configs: 3,
};

const affiliateDashboardMock = {
  total_links: 48,
  total_clicks: 16420,
  total_orders: 126,
  pending_commission: 213600,
  approved_commission: 8935000,
  wallet_balance: 5120000,
  conversion_rate: 3.7,
};

export {
  adminDashboardMock,
  affiliateDashboardMock,
  sellerDashboardMock,
};
