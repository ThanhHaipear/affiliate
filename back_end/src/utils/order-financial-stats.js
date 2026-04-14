const ACTIVE_ORDER_STATUSES = new Set(["CREATED", "PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED"]);

function toNumber(value) {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function sumItems(items = [], key) {
  return items.reduce((sum, item) => sum + toNumber(item?.[key]), 0);
}

function isActiveOrder(order = {}) {
  return ACTIVE_ORDER_STATUSES.has(order.status);
}

function summarizeOrderFinancialStats(orders = []) {
  const summary = {
    counts: {
      totalOrders: orders.length,
      activeOrders: 0,
      settledOrders: 0,
      pendingSettlementOrders: 0,
      affiliateOrders: 0,
    },
    amounts: {
      grossRevenue: 0,
      affiliateRevenue: 0,
      directRevenue: 0,
      pendingPlatformFee: 0,
      settledPlatformFee: 0,
      pendingCommission: 0,
      settledCommission: 0,
      pendingSellerNet: 0,
      settledSellerNet: 0,
    },
  };

  for (const order of orders) {
    if (!isActiveOrder(order)) {
      continue;
    }

    const orderTotal = toNumber(order.totalAmount);
    const hasAffiliate = (order.items || []).some((item) => item.affiliateId);
    const platformFee = sumItems(order.items, "platformFeeAmount");
    const commission = sumItems(order.items, "commissionAmount");
    const sellerNet = sumItems(order.items, "sellerNetAmount");

    summary.counts.activeOrders += 1;
    summary.amounts.grossRevenue += orderTotal;

    if (hasAffiliate) {
      summary.counts.affiliateOrders += 1;
      summary.amounts.affiliateRevenue += orderTotal;
    } else {
      summary.amounts.directRevenue += orderTotal;
    }

    if (order.sellerConfirmedReceivedMoney) {
      summary.counts.settledOrders += 1;
      summary.amounts.settledPlatformFee += platformFee;
      summary.amounts.settledCommission += commission;
      summary.amounts.settledSellerNet += sellerNet;
    } else {
      summary.counts.pendingSettlementOrders += 1;
      summary.amounts.pendingPlatformFee += platformFee;
      summary.amounts.pendingCommission += commission;
      summary.amounts.pendingSellerNet += sellerNet;
    }
  }

  return summary;
}

module.exports = {
  summarizeOrderFinancialStats,
};
