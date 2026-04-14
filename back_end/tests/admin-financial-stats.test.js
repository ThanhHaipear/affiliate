const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const adminRepositoryPath = path.resolve(__dirname, "../src/modules/admin/admin.repository.js");

test("adminRepository.getFinancialStats forwards filters and summarizes pending and settled values", async () => {
  const findManyCalls = [];
  const mockOrders = [
    {
      status: "PAID",
      totalAmount: BigInt(120000),
      sellerConfirmedReceivedMoney: false,
      items: [
        {
          affiliateId: 20,
          commissionAmount: BigInt(12000),
          platformFeeAmount: BigInt(6000),
          sellerNetAmount: BigInt(102000),
        },
      ],
    },
    {
      status: "COMPLETED",
      totalAmount: BigInt(90000),
      sellerConfirmedReceivedMoney: true,
      items: [
        {
          affiliateId: null,
          commissionAmount: BigInt(0),
          platformFeeAmount: BigInt(4500),
          sellerNetAmount: BigInt(85500),
        },
      ],
    },
    {
      status: "CANCELLED",
      totalAmount: BigInt(50000),
      sellerConfirmedReceivedMoney: false,
      items: [
        {
          affiliateId: 22,
          commissionAmount: BigInt(5000),
          platformFeeAmount: BigInt(2500),
          sellerNetAmount: BigInt(42500),
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

  delete require.cache[adminRepositoryPath];
  const adminRepository = require(adminRepositoryPath);

  const result = await adminRepository.getFinancialStats({
    status: "PAID",
    sellerConfirmed: false,
  });

  assert.equal(findManyCalls.length, 1);
  assert.equal(findManyCalls[0].where.status, "PAID");
  assert.equal(findManyCalls[0].where.sellerConfirmedReceivedMoney, false);
  assert.equal(result.counts.totalOrders, 3);
  assert.equal(result.counts.activeOrders, 2);
  assert.equal(result.counts.settledOrders, 1);
  assert.equal(result.counts.pendingSettlementOrders, 1);
  assert.equal(result.counts.affiliateOrders, 1);
  assert.equal(result.amounts.grossRevenue, 210000);
  assert.equal(result.amounts.affiliateRevenue, 120000);
  assert.equal(result.amounts.directRevenue, 90000);
  assert.equal(result.amounts.pendingPlatformFee, 6000);
  assert.equal(result.amounts.settledPlatformFee, 4500);
  assert.equal(result.amounts.pendingCommission, 12000);
  assert.equal(result.amounts.settledCommission, 0);
  assert.equal(result.amounts.pendingSellerNet, 102000);
  assert.equal(result.amounts.settledSellerNet, 85500);

  delete require.cache[prismaPath];
  delete require.cache[adminRepositoryPath];
});
