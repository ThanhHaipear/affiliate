require('dotenv').config();

const baseUrl = process.env.SMOKE_TEST_BASE_URL || `http://127.0.0.1:${process.env.PORT || 4000}`;

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} ${path}`);
    error.response = data;
    throw error;
  }

  return data;
}

function toNumber(value) {
  return Number(value || 0);
}

async function main() {
  const suffix = Math.floor(Date.now() / 1000);
  const unitPrice = 1000000;

  const health = await request('/health');

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin.test@example.com', password: '123456' }
  });
  const adminToken = adminLogin.data.accessToken;

  const sellerRegister = await request('/api/auth/register', {
    method: 'POST',
    body: {
      email: `seller.full.${suffix}@example.com`,
      password: '123456',
      role: 'SELLER',
      fullName: 'Seller Full Test',
      shopName: 'Seller Full Shop'
    }
  });
  const sellerToken = sellerRegister.data.accessToken;
  const sellerAccountId = sellerRegister.data.account.id;

  const affiliateRegister = await request('/api/auth/register', {
    method: 'POST',
    body: {
      email: `affiliate.full.${suffix}@example.com`,
      password: '123456',
      role: 'AFFILIATE',
      fullName: 'Affiliate Full Test'
    }
  });
  const affiliateToken = affiliateRegister.data.accessToken;
  const affiliateAccountId = affiliateRegister.data.account.id;

  const customerRegister = await request('/api/auth/register', {
    method: 'POST',
    body: {
      email: `customer.full.${suffix}@example.com`,
      password: '123456',
      role: 'CUSTOMER',
      fullName: 'Customer Full Test'
    }
  });
  const customerToken = customerRegister.data.accessToken;
  const customerAccountId = customerRegister.data.account.id;

  await request('/api/seller/payment-accounts', {
    method: 'POST',
    token: sellerToken,
    body: {
      type: 'BANK',
      accountName: 'Seller Full Test',
      accountNumber: '400000001',
      bankName: 'VCB',
      branch: 'HCM',
      makeDefault: true
    }
  });

  await request('/api/affiliate/payment-accounts', {
    method: 'POST',
    token: affiliateToken,
    body: {
      type: 'BANK',
      accountName: 'Affiliate Full Test',
      accountNumber: '500000001',
      bankName: 'ACB',
      branch: 'HCM',
      makeDefault: true
    }
  });

  await request('/api/affiliate/channels', {
    method: 'POST',
    token: affiliateToken,
    body: {
      platform: 'YouTube',
      url: 'https://youtube.com/@affiliate-full-test',
      description: 'full smoke test channel'
    }
  });

  const dashboard1 = await request('/api/admin/dashboard', { token: adminToken });
  const pendingSeller = dashboard1.data.pendingSellers.find((item) => item.ownerAccountId === sellerAccountId);
  const pendingAffiliate = dashboard1.data.pendingAffiliates.find((item) => item.accountId === affiliateAccountId);

  await request(`/api/admin/sellers/${pendingSeller.id}/review`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'APPROVED' }
  });

  await request(`/api/admin/affiliates/${pendingAffiliate.accountId}/review`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'APPROVED' }
  });

  const productCreate = await request('/api/products', {
    method: 'POST',
    token: sellerToken,
    body: {
      name: `Full Flow Product ${suffix}`,
      slug: `full-flow-product-${suffix}`,
      description: 'Full smoke test product',
      basePrice: unitPrice,
      images: [{ url: 'https://example.com/full-flow-product.jpg', sortOrder: 1 }],
      variants: [{ sku: `FULL-${suffix}`, variantName: 'Default', options: { color: 'blue' }, price: unitPrice, quantity: 5 }]
    }
  });
  const productId = productCreate.data.id;
  const variantId = productCreate.data.variants[0].id;

  await request(`/api/seller/products/${productId}/affiliate-setting`, {
    method: 'PUT',
    token: sellerToken,
    body: { commissionType: 'PERCENT', commissionValue: 10, isEnabled: true }
  });

  const dashboard2 = await request('/api/admin/dashboard', { token: adminToken });
  const pendingCatalogProduct = dashboard2.data.pendingCatalogProducts.find((item) => item.id === productId);
  const pendingSetting = dashboard2.data.pendingProducts.find((item) => item.productId === productId);

  const approveProduct = await request(`/api/admin/products/${pendingCatalogProduct.id}/review`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'APPROVED' }
  });

  const approveSetting = await request(`/api/admin/product-affiliate-settings/${pendingSetting.id}/review`, {
    method: 'PATCH',
    token: adminToken,
    body: { status: 'APPROVED' }
  });

  const publicProducts = await request('/api/products');
  const publicProduct = publicProducts.data.find((item) => item.id === productId);

  const linkCreate = await request('/api/tracking/links', {
    method: 'POST',
    token: affiliateToken,
    body: { productId }
  });

  const click = await request('/api/tracking/clicks', {
    method: 'POST',
    body: {
      shortCode: linkCreate.data.shortCode,
      viewerId: customerAccountId,
      referrer: 'https://youtube.com',
      deviceId: `full-device-${suffix}`
    }
  });
  const attributionToken = click.data.attribution.token;

  await request('/api/cart/items', {
    method: 'POST',
    token: customerToken,
    body: { productId, variantId, quantity: 1, attributionToken }
  });

  const checkout = await request('/api/cart/checkout', {
    method: 'POST',
    token: customerToken,
    body: {
      shippingFee: 0,
      discountAmount: 0,
      buyerName: 'Customer Full Test',
      buyerEmail: `customer.full.${suffix}@example.com`,
      buyerPhone: '0911111111',
      paymentMethod: 'BANK_TRANSFER'
    }
  });
  const orderId = checkout.data.id;

  await request(`/api/payments/${orderId}/pay`, {
    method: 'POST',
    token: customerToken,
    body: { transactionCode: `FULL-TXN-${suffix}` }
  });

  const sellerConfirm = await request(`/api/payments/${orderId}/seller-confirm`, {
    method: 'POST',
    token: sellerToken,
    body: { note: 'confirmed in smoke test' }
  });

  const affiliateStats = await request('/api/affiliate/stats', { token: affiliateToken });
  const affiliateCommissions = await request('/api/commissions/me', { token: affiliateToken });
  const sellerWallets = await request('/api/wallets/me', { token: sellerToken });
  const affiliateWallets = await request('/api/wallets/me', { token: affiliateToken });
  const adminWallets = await request('/api/wallets/me', { token: adminToken });

  const affiliateWithdrawal = await request('/api/withdrawals', {
    method: 'POST',
    token: affiliateToken,
    body: { amount: 100000 }
  });

  const sellerWithdrawal = await request('/api/withdrawals', {
    method: 'POST',
    token: sellerToken,
    body: { amount: 100000 }
  });

  const pendingWithdrawals = await request('/api/withdrawals/pending/list', { token: adminToken });
  const pendingIds = pendingWithdrawals.data.map((item) => Number(item.id));

  const batch = await request('/api/payout-batches', {
    method: 'POST',
    token: adminToken,
    body: {
      payoutDate: new Date().toISOString().slice(0, 10),
      type: 'BANK_TRANSFER',
      withdrawalIds: pendingIds,
      bankName: 'TEST BANK',
      branch: 'HCM',
      note: 'full smoke test payout'
    }
  });

  const processedBatch = await request(`/api/payout-batches/${batch.data.id}/process`, {
    method: 'POST',
    token: adminToken,
    body: { transactionCodePrefix: `BATCH-${suffix}` }
  });

  const affiliateWithdrawals = await request('/api/withdrawals/me', { token: affiliateToken });
  const sellerWithdrawals = await request('/api/withdrawals/me', { token: sellerToken });

  const sellerWalletBalance = toNumber(sellerWallets.data[0]?.balance);
  const affiliateWalletBalance = toNumber(affiliateWallets.data[0]?.balance);
  const platformWalletBalance = toNumber(adminWallets.data[0]?.balance);

  console.log(JSON.stringify({
    health: health.success,
    productPublic: Boolean(publicProduct),
    productReviewStatus: approveProduct.data.status,
    affiliateSettingStatus: approveSetting.data.approvalStatus,
    orderStatus: sellerConfirm.data.status,
    affiliateApprovedCommission: affiliateStats.data.approvedCommission,
    affiliateCommissionCount: affiliateCommissions.data.length,
    sellerWalletBalance,
    affiliateWalletBalance,
    platformWalletBalance,
    affiliateWithdrawalStatus: affiliateWithdrawal.data.status,
    sellerWithdrawalStatus: sellerWithdrawal.data.status,
    payoutBatchStatus: processedBatch.data.status,
    affiliateWithdrawalFinal: affiliateWithdrawals.data[0]?.status,
    sellerWithdrawalFinal: sellerWithdrawals.data[0]?.status
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ message: error.message, response: error.response || null }, null, 2));
  process.exit(1);
});

