function toNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function toText(value, fallback = "--") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function buildPaymentLabel(paymentAccount) {
  if (!paymentAccount) {
    return "Chua co tai khoan nhan tien";
  }

  return [paymentAccount.type, paymentAccount.bankName, paymentAccount.accountNumber]
    .filter(Boolean)
    .join(" | ");
}

function deriveRiskLevel({ hasKyc, hasPaymentAccount, hasRejectReason }) {
  if (hasRejectReason) {
    return "HIGH";
  }

  if (!hasKyc || !hasPaymentAccount) {
    return "MEDIUM";
  }

  return "LOW";
}

function mapPendingSellerDto(seller) {
  const paymentAccount = seller.paymentAccounts?.[0];
  const hasKyc = Boolean(seller.kyc);
  const hasPaymentAccount = Boolean(paymentAccount);

  return {
    id: String(seller.id),
    rowKey: `seller-${seller.id}`,
    shopName: toText(seller.shopName),
    ownerName: toText(
      seller.kyc?.fullNameOnDocument || seller.ownerAccount?.email || seller.ownerAccount?.phone,
      `Owner #${seller.ownerAccountId}`,
    ),
    email: toText(seller.email || seller.ownerAccount?.email),
    phone: toText(seller.phone || seller.ownerAccount?.phone),
    category: toText(seller.businessField || seller.ownerType),
    submittedAt: seller.createdAt,
    riskLevel: deriveRiskLevel({
      hasKyc,
      hasPaymentAccount,
      hasRejectReason: Boolean(seller.rejectReason),
    }),
    kycStatus: toText(seller.kyc?.status || seller.approvalStatus, "PENDING"),
    paymentMethod: buildPaymentLabel(paymentAccount),
    description: toText(seller.shopDescription, "Seller chua bo sung mo ta shop."),
    documents: [
      seller.kyc?.documentType ? `Loai giay to: ${seller.kyc.documentType}` : null,
      seller.kyc?.documentNumber ? `So giay to: ${seller.kyc.documentNumber}` : null,
      seller.taxCode ? `Ma so thue: ${seller.taxCode}` : null,
      seller.address ? `Dia chi: ${seller.address}` : null,
    ].filter(Boolean),
    activities: [
      seller.kyc?.fullNameOnDocument
        ? `Nguoi dung khai bao ten KYC: ${seller.kyc.fullNameOnDocument}.`
        : "Chua co ten KYC day du trong ho so.",
      hasPaymentAccount
        ? `Da co tai khoan nhan tien: ${buildPaymentLabel(paymentAccount)}.`
        : "Chua co tai khoan nhan tien de admin duyet.",
      seller.rejectReason ? `Lan review truoc bi tu choi: ${seller.rejectReason}.` : null,
    ].filter(Boolean),
    raw: seller,
  };
}

function mapPendingAffiliateDto(affiliate) {
  const paymentAccount = affiliate.paymentAccounts?.[0];
  const hasKyc = Boolean(affiliate.kyc);
  const hasPaymentAccount = Boolean(paymentAccount);

  return {
    id: String(affiliate.accountId),
    rowKey: `affiliate-${affiliate.accountId}`,
    fullName: toText(
      affiliate.fullName || affiliate.kyc?.fullNameOnDocument || affiliate.account?.email,
      `Affiliate #${affiliate.accountId}`,
    ),
    email: toText(affiliate.account?.email),
    phone: toText(affiliate.account?.phone),
    primaryChannel: toText(affiliate.activityStatus, "ACTIVE"),
    paymentMethod: buildPaymentLabel(paymentAccount),
    submittedAt: affiliate.createdAt,
    riskLevel: deriveRiskLevel({
      hasKyc,
      hasPaymentAccount,
      hasRejectReason: Boolean(affiliate.kyc?.rejectReason),
    }),
    channelUrl: "Backend chua tra ve kenh affiliate chi tiet",
    description: hasKyc
      ? "Ho so affiliate dang cho admin review KYC va tai khoan nhan tien."
      : "Ho so affiliate chua co ban ghi KYC chi tiet.",
    documents: [
      affiliate.kyc?.documentType ? `Loai giay to: ${affiliate.kyc.documentType}` : null,
      affiliate.kyc?.documentNumber ? `So giay to: ${affiliate.kyc.documentNumber}` : null,
      affiliate.kyc?.nationality ? `Quoc tich: ${affiliate.kyc.nationality}` : null,
      affiliate.kyc?.permanentAddress ? `Dia chi thuong tru: ${affiliate.kyc.permanentAddress}` : null,
    ].filter(Boolean),
    activities: [
      hasKyc ? `KYC hien tai: ${affiliate.kyc.status}.` : "Chua co KYC chi tiet.",
      hasPaymentAccount
        ? `Da cau hinh tai khoan nhan tien: ${buildPaymentLabel(paymentAccount)}.`
        : "Chua co tai khoan nhan tien de admin duyet.",
      affiliate.kyc?.rejectReason ? `Ly do tu choi truoc do: ${affiliate.kyc.rejectReason}.` : null,
    ].filter(Boolean),
    raw: affiliate,
  };
}

function mapVariantRows(variants = []) {
  return variants.map((variant) => ({
    id: String(variant.id),
    name: toText(variant.variantName || variant.sku, `Variant #${variant.id}`),
    sku: toText(variant.sku),
    price: toNumber(variant.price),
    quantity: toNumber(variant.inventory?.quantity),
  }));
}

function mapPendingCatalogProductDto(product) {
  const variantPrice = product.variants?.[0]?.price;
  const stock = (product.variants || []).reduce(
    (sum, variant) => sum + toNumber(variant.inventory?.quantity),
    0,
  );

  return {
    id: String(product.id),
    rowKey: `catalog-${product.id}`,
    routeId: `catalog-${product.id}`,
    reviewTarget: "catalog",
    reviewEntityId: String(product.id),
    productId: String(product.id),
    name: toText(product.name),
    sellerName: toText(product.seller?.shopName, `Seller #${product.sellerId}`),
    category: "Catalog approval",
    productCategory: toText(product.category?.name, "General"),
    price: toNumber(variantPrice ?? product.basePrice),
    commissionRate: product.affiliateSetting
      ? `${toNumber(product.affiliateSetting.commissionValue)} ${toText(product.affiliateSetting.commissionType, "")}`.trim()
      : "--",
    submittedAt: product.createdAt,
    status: toText(product.status, "PENDING"),
    stock,
    description: toText(product.description, "San pham chua co mo ta chi tiet."),
    highlights: [
      product.images?.length
        ? `Da co ${product.images.length} hinh anh san pham trong ho so.`
        : "San pham chua co hinh anh trong ban ghi pending.",
      stock > 0 ? `Tong ton kho tu cac bien the: ${stock}.` : "Chua co ton kho hoac inventory chua duoc dong bo.",
      "Admin se review trang thai catalog truoc khi cho phep hien thi cong khai.",
    ],
    riskLevel: stock > 0 && product.images?.length ? "LOW" : "MEDIUM",
    sourceLabel: "Catalog approval",
    gallery: product.images?.map((image) => image.url) || [],
    variants: mapVariantRows(product.variants),
    raw: product,
  };
}

function mapPendingAffiliateSettingDto(setting) {
  const stock = (setting.product?.variants || []).reduce(
    (sum, variant) => sum + toNumber(variant.inventory?.quantity),
    0,
  );

  return {
    id: String(setting.id),
    rowKey: `affiliate-setting-${setting.id}`,
    routeId: `affiliate-setting-${setting.id}`,
    reviewTarget: "affiliate-setting",
    reviewEntityId: String(setting.id),
    productId: String(setting.productId),
    name: toText(setting.product?.name, `Product #${setting.productId}`),
    sellerName: toText(setting.seller?.shopName, `Seller #${setting.sellerId}`),
    category: "Affiliate setting approval",
    productCategory: toText(setting.product?.category?.name, "General"),
    price: toNumber(setting.product?.variants?.[0]?.price ?? setting.product?.basePrice),
    commissionRate: `${toNumber(setting.commissionValue)} ${toText(setting.commissionType, "")}`.trim(),
    submittedAt: setting.createdAt,
    status: toText(setting.approvalStatus, "PENDING"),
    stock,
    description: toText(setting.product?.description, "Cau hinh hoa hong san pham dang cho admin duyet."),
    highlights: [
      `Commission type: ${toText(setting.commissionType)}.`,
      `Commission value: ${toNumber(setting.commissionValue)}.`,
      setting.isEnabled ? "Affiliate setting dang bat." : "Affiliate setting dang tat.",
    ],
    riskLevel: setting.isEnabled ? "LOW" : "MEDIUM",
    sourceLabel: "Affiliate setting approval",
    gallery: setting.product?.images?.map((image) => image.url) || [],
    variants: mapVariantRows(setting.product?.variants),
    raw: setting,
  };
}

function buildReviewScopes(catalogReview, affiliateReview) {
  return [
    catalogReview.available ? "catalog" : null,
    affiliateReview.available ? "affiliate" : null,
  ].filter(Boolean);
}

function buildReviewSummary(reviewScopes) {
  if (!reviewScopes.length) {
    return "Da duyet xong";
  }

  if (reviewScopes.length === 2) {
    return "Dang cho duyet catalog va affiliate";
  }

  return reviewScopes[0] === "catalog"
    ? "Dang cho duyet catalog"
    : "Dang cho duyet affiliate";
}

function groupPendingProductRows(catalogRows = [], affiliateRows = []) {
  const grouped = new Map();

  for (const row of catalogRows) {
    grouped.set(row.productId, {
      rowKey: `product-${row.productId}`,
      productId: row.productId,
      name: row.name,
      sellerName: row.sellerName,
      productCategory: row.productCategory,
      price: row.price,
      commissionRate: row.commissionRate,
      submittedAt: row.submittedAt,
      stock: row.stock,
      gallery: row.gallery,
      variants: row.variants,
      description: row.description,
      riskLevel: row.riskLevel,
      routeId: row.productId,
      catalogReview: {
        reviewEntityId: row.reviewEntityId,
        legacyRouteId: row.routeId,
        status: row.status,
        available: true,
      },
      affiliateReview: {
        reviewEntityId: null,
        legacyRouteId: null,
        status: row.commissionRate !== "--" ? "APPROVED" : "NOT_SUBMITTED",
        available: false,
      },
    });
  }

  for (const row of affiliateRows) {
    const existing = grouped.get(row.productId);
    if (existing) {
      existing.commissionRate = row.commissionRate || existing.commissionRate;
      existing.affiliateReview = {
        reviewEntityId: row.reviewEntityId,
        legacyRouteId: row.routeId,
        status: row.status,
        available: true,
      };
      if (!existing.gallery?.length) {
        existing.gallery = row.gallery;
      }
      if (!existing.variants?.length) {
        existing.variants = row.variants;
      }
      if (!existing.description || existing.description === "--") {
        existing.description = row.description;
      }
      if (!existing.stock) {
        existing.stock = row.stock;
      }
      continue;
    }

    grouped.set(row.productId, {
      rowKey: `product-${row.productId}`,
      productId: row.productId,
      name: row.name,
      sellerName: row.sellerName,
      productCategory: row.productCategory,
      price: row.price,
      commissionRate: row.commissionRate,
      submittedAt: row.submittedAt,
      stock: row.stock,
      gallery: row.gallery,
      variants: row.variants,
      description: row.description,
      riskLevel: row.riskLevel,
      routeId: row.productId,
      catalogReview: {
        reviewEntityId: null,
        legacyRouteId: null,
        status: "APPROVED",
        available: false,
      },
      affiliateReview: {
        reviewEntityId: row.reviewEntityId,
        legacyRouteId: row.routeId,
        status: row.status,
        available: true,
      },
    });
  }

  return Array.from(grouped.values())
    .map((row) => {
      const reviewScopes = buildReviewScopes(row.catalogReview, row.affiliateReview);

      return {
        ...row,
        reviewScopes,
        reviewStatus: reviewScopes.length ? "PENDING" : "APPROVED",
        reviewSummary: buildReviewSummary(reviewScopes),
      };
    })
    .sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
}

function mapAdminOverview(overview) {
  const pendingSellers = (overview?.pendingSellers || []).map(mapPendingSellerDto);
  const pendingAffiliates = (overview?.pendingAffiliates || []).map(mapPendingAffiliateDto);
  const pendingCatalogProducts = (overview?.pendingCatalogProducts || []).map(mapPendingCatalogProductDto);
  const pendingAffiliateSettings = (overview?.pendingProducts || []).map(mapPendingAffiliateSettingDto);
  const groupedPendingProducts = groupPendingProductRows(pendingCatalogProducts, pendingAffiliateSettings);

  return {
    pendingSellers,
    pendingAffiliates,
    pendingCatalogProducts,
    pendingAffiliateSettings,
    pendingProducts: [...pendingCatalogProducts, ...pendingAffiliateSettings],
    groupedPendingProducts,
    counts: {
      pendingSellers: pendingSellers.length,
      pendingAffiliates: pendingAffiliates.length,
      pendingCatalogProducts: pendingCatalogProducts.length,
      pendingAffiliateSettings: pendingAffiliateSettings.length,
      pendingProducts: groupedPendingProducts.length,
    },
  };
}

function parseAdminProductRouteId(routeId = "") {
  const normalized = String(routeId);

  if (normalized.startsWith("affiliate-setting-")) {
    return {
      reviewTarget: "affiliate-setting",
      reviewEntityId: normalized.slice("affiliate-setting-".length),
      productId: null,
    };
  }

  if (normalized.startsWith("catalog-")) {
    return {
      reviewTarget: "catalog",
      reviewEntityId: normalized.slice("catalog-".length),
      productId: null,
    };
  }

  return { reviewTarget: "product", reviewEntityId: normalized, productId: normalized };
}

function mapAdminAccountDto(account) {
  const roles = (account.accountRoles || []).map((item) => item.role?.code).filter(Boolean);
  const seller = account.sellers?.[0];
  const displayName =
    account.customerProfile?.fullName ||
    account.adminProfile?.fullName ||
    account.affiliate?.fullName ||
    seller?.shopName ||
    account.email ||
    account.phone ||
    `Account #${account.id}`;

  return {
    id: String(account.id),
    displayName,
    email: toText(account.email),
    phone: toText(account.phone),
    roles,
    status: toText(account.status, "ACTIVE"),
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt,
    lockReason: toText(account.lockReason, "--"),
    sellerApprovalStatus: seller?.approvalStatus || "--",
    affiliateKycStatus: account.affiliate?.kycStatus || "--",
    raw: account,
  };
}

function mapAdminOrderDto(order) {
  const payment = order.payments?.[0];
  const latestRefund = order.refunds?.[0] || null;
  const attributedItems = (order.items || []).filter((item) => item.affiliateId);
  const commissionTotal = (order.commissions || []).reduce(
    (sum, item) => sum + (item.status === "REJECTED" ? 0 : toNumber(item.totalCommission)),
    0,
  );
  const hasAffiliateAttribution = attributedItems.length > 0;

  return {
    id: String(order.id),
    code: toText(order.orderCode, `#${order.id}`),
    buyer: toText(order.buyerName || order.buyer?.email || order.buyer?.phone),
    seller: toText(order.seller?.shopName, `Seller #${order.sellerId}`),
    totalAmount: toNumber(order.totalAmount),
    orderStatus: toText(order.status, "CREATED"),
    paymentStatus: toText(payment?.status, "PENDING"),
    paymentMethod: toText(payment?.method),
    latestRefundId: latestRefund?.id ? String(latestRefund.id) : "",
    latestRefundStatus: latestRefund?.status || "",
    latestRefundReason: latestRefund?.reason || "",
    sellerConfirmedReceivedMoney: Boolean(order.sellerConfirmedReceivedMoney),
    affiliateOrders: attributedItems.length,
    hasAffiliateAttribution,
    affiliateLabel: hasAffiliateAttribution ? "Có" : "Không",
    commissionTotal,
    createdAt: order.createdAt,
    raw: order,
  };
}

function mapFraudAlertDto(alert) {
  return {
    id: String(alert.id),
    targetType: toText(alert.targetType),
    targetId: toText(alert.targetId),
    alertType: toText(alert.alertType),
    severity: toText(alert.severity, "MEDIUM"),
    processStatus: toText(alert.processStatus, "OPEN"),
    description: toText(alert.description, "Khong co mo ta."),
    processedBy: toText(alert.processedByAccount?.email || alert.processedByAccount?.phone),
    processedAt: alert.processedAt,
    createdAt: alert.createdAt,
    raw: alert,
  };
}

export {
  mapAdminAccountDto,
  mapAdminOrderDto,
  mapAdminOverview,
  mapFraudAlertDto,
  parseAdminProductRouteId,
};
