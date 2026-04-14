const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const sellerRepositoryPath = path.resolve(__dirname, "../src/modules/seller/seller.repository.js");

test("sellerRepository.getStats returns pending and settled seller financial stats", async () => {
  const findManyCalls = [];
  const mockOrders = [
    {
      status: "PENDING_PAYMENT",
      totalAmount: BigInt(100000),
      sellerConfirmedReceivedMoney: false,
      items: [
        {
          affiliateId: 10,
          commissionAmount: BigInt(10000),
          platformFeeAmount: BigInt(5000),
          sellerNetAmount: BigInt(85000),
        },
      ],
    },
    {
      status: "COMPLETED",
      totalAmount: BigInt(200000),
      sellerConfirmedReceivedMoney: true,
      items: [
        {
          affiliateId: 11,
          commissionAmount: BigInt(20000),
          platformFeeAmount: BigInt(10000),
          sellerNetAmount: BigInt(170000),
        },
      ],
    },
    {
      status: "REFUNDED",
      totalAmount: BigInt(300000),
      sellerConfirmedReceivedMoney: false,
      items: [
        {
          affiliateId: 12,
          commissionAmount: BigInt(30000),
          platformFeeAmount: BigInt(15000),
          sellerNetAmount: BigInt(255000),
        },
      ],
    },
  ];

  require.cache[prismaPath] = {
    exports: {
      order: {
        findMany: async (payload) => {
          findManyCalls.push(payload);
          return mockOrders;
        },
      },
    },
  };

  delete require.cache[sellerRepositoryPath];
  const sellerRepository = require(sellerRepositoryPath);

  const result = await sellerRepository.getStats(55);

  assert.equal(findManyCalls.length, 1);
  assert.equal(findManyCalls[0].where.sellerId, 55);
  assert.equal(result.counts.totalOrders, 3);
  assert.equal(result.counts.activeOrders, 2);
  assert.equal(result.counts.settledOrders, 1);
  assert.equal(result.counts.pendingSettlementOrders, 1);
  assert.equal(result.counts.affiliateOrders, 2);
  assert.equal(result.amounts.grossRevenue, 300000);
  assert.equal(result.amounts.affiliateRevenue, 300000);
  assert.equal(result.amounts.directRevenue, 0);
  assert.equal(result.amounts.pendingPlatformFee, 5000);
  assert.equal(result.amounts.settledPlatformFee, 10000);
  assert.equal(result.amounts.pendingCommission, 10000);
  assert.equal(result.amounts.settledCommission, 20000);
  assert.equal(result.amounts.pendingSellerNet, 85000);
  assert.equal(result.amounts.settledSellerNet, 170000);

  delete require.cache[prismaPath];
  delete require.cache[sellerRepositoryPath];
});
