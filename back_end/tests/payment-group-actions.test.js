const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const paymentRepositoryPath = path.resolve(__dirname, "../src/modules/payment/payment.repository.js");
const paymentServicePath = path.resolve(__dirname, "../src/modules/payment/payment.service.js");
const envPath = path.resolve(__dirname, "../src/config/env.js");

test("paymentRepository.markPaidBatch generates unique transaction codes per payment", async () => {
  const paymentUpdates = [];
  let findManyCallCount = 0;

  require.cache[prismaPath] = {
    exports: {
      $transaction: async (callback) =>
        callback({
          order: {
            findMany: async ({ where }) => {
              findManyCallCount += 1;
              const ids = (where?.id?.in || []).map((item) => String(item));
              const pendingSnapshot = [
                {
                  id: 11n,
                  orderCode: "ORD-G-1",
                  buyerId: 5,
                  status: "PENDING_PAYMENT",
                  seller: { ownerAccountId: 101 },
                  payments: [{ id: 1001n, status: "PENDING" }],
                  items: [],
                },
                {
                  id: 12n,
                  orderCode: "ORD-G-1",
                  buyerId: 5,
                  status: "PENDING_PAYMENT",
                  seller: { ownerAccountId: 102 },
                  payments: [{ id: 1002n, status: "PENDING" }],
                  items: [],
                },
              ];
              const paidSnapshot = pendingSnapshot.map((item) => ({
                ...item,
                status: "PAID",
                payments: [{ id: item.payments[0].id, status: "PAID" }],
              }));

              const source = findManyCallCount === 1 ? pendingSnapshot : paidSnapshot;
              return source.filter((item) => ids.includes(String(item.id)));
            },
            update: async () => ({}),
          },
          payment: {
            update: async ({ data }) => {
              paymentUpdates.push(data);
              return data;
            },
          },
          orderStatusHistory: { create: async () => ({}) },
          activityLog: { create: async () => ({}) },
          notification: { create: async () => ({}) },
        }),
    },
  };

  delete require.cache[paymentRepositoryPath];
  const paymentRepository = require(paymentRepositoryPath);

  await paymentRepository.markPaidBatch([11n, 12n], "VNPAY-TRANS-ABC");

  assert.equal(paymentUpdates.length, 2);
  assert.equal(paymentUpdates[0].transactionCode, "VNPAY-TRANS-ABC-11");
  assert.equal(paymentUpdates[1].transactionCode, "VNPAY-TRANS-ABC-12");
  assert.notEqual(paymentUpdates[0].transactionCode, paymentUpdates[1].transactionCode);

  delete require.cache[prismaPath];
  delete require.cache[paymentRepositoryPath];
});

test("paymentService.changePaymentMethod updates all grouped customer orders", async () => {
  const changeCalls = [];

  require.cache[envPath] = {
    exports: {},
  };

  require.cache[prismaPath] = {
    exports: {
      order: {
        findUnique: async () => ({
          id: 11n,
          buyerId: 77,
          orderCode: "ORD-G-2",
          payments: [{ id: 201n, method: "VNPAY", status: "PENDING" }],
        }),
        findMany: async () => ([
          {
            id: 11n,
            buyerId: 77,
            orderCode: "ORD-G-2",
            status: "PENDING_PAYMENT",
            payments: [{ id: 201n, method: "VNPAY", status: "PENDING" }],
          },
          {
            id: 12n,
            buyerId: 77,
            orderCode: "ORD-G-2",
            status: "PENDING_PAYMENT",
            payments: [{ id: 202n, method: "VNPAY", status: "PENDING" }],
          },
        ]),
      },
      refund: {
        findFirst: async () => null,
      },
      seller: {
        findFirst: async () => null,
      },
    },
  };

  require.cache[paymentRepositoryPath] = {
    exports: {
      changePendingPaymentMethodForOrders: async (orderIds, actorId, paymentMethod) => {
        changeCalls.push({
          orderIds: orderIds.map((item) => String(item)),
          actorId,
          paymentMethod,
        });
        return [];
      },
    },
  };

  delete require.cache[paymentServicePath];
  const paymentService = require(paymentServicePath);

  await paymentService.changePaymentMethod(77, 11, { paymentMethod: "COD" });

  assert.equal(changeCalls.length, 1);
  assert.deepEqual(changeCalls[0], {
    orderIds: ["11", "12"],
    actorId: 77,
    paymentMethod: "COD",
  });

  delete require.cache[envPath];
  delete require.cache[prismaPath];
  delete require.cache[paymentRepositoryPath];
  delete require.cache[paymentServicePath];
});

test("paymentService.cancelOrder creates refund requests for the whole grouped paid VNPAY order", async () => {
  const refundRequestCalls = [];

  require.cache[envPath] = {
    exports: {},
  };

  require.cache[prismaPath] = {
    exports: {
      order: {
        findUnique: async () => ({
          id: 21n,
          buyerId: 55,
          orderCode: "ORD-G-3",
          payments: [{ id: 301n, method: "VNPAY", status: "PAID" }],
        }),
        findMany: async () => ([
          {
            id: 21n,
            buyerId: 55,
            orderCode: "ORD-G-3",
            status: "PAID",
            sellerConfirmedReceivedMoney: false,
            payments: [{ id: 301n, method: "VNPAY", status: "PAID" }],
          },
          {
            id: 22n,
            buyerId: 55,
            orderCode: "ORD-G-3",
            status: "PAID",
            sellerConfirmedReceivedMoney: false,
            payments: [{ id: 302n, method: "CARD", status: "PAID" }],
          },
        ]),
      },
      refund: {
        findFirst: async () => null,
      },
      seller: {
        findFirst: async () => null,
      },
    },
  };

  require.cache[paymentRepositoryPath] = {
    exports: {
      createRefundRequestsForOrders: async ({ orderIds, actorId, reason }) => {
        refundRequestCalls.push({
          orderIds: orderIds.map((item) => String(item)),
          actorId,
          reason,
        });
        return [{ id: 1n }, { id: 2n }];
      },
    },
  };

  delete require.cache[paymentServicePath];
  const paymentService = require(paymentServicePath);

  const result = await paymentService.cancelOrder(55, 21, {
    reason: "Khach muon huy ca cum don",
  });

  assert.equal(refundRequestCalls.length, 1);
  assert.deepEqual(refundRequestCalls[0], {
    orderIds: ["21", "22"],
    actorId: 55,
    reason: "Khach muon huy ca cum don",
  });
  assert.equal(result.action, "REFUND_REQUESTED");
  assert.equal(result.totalOrders, 2);
  assert.equal(result.orderCode, "ORD-G-3");

  delete require.cache[envPath];
  delete require.cache[prismaPath];
  delete require.cache[paymentRepositoryPath];
  delete require.cache[paymentServicePath];
});

test("paymentService.refundOrder cancels only the selected unpaid COD seller-order for customer", async () => {
  const cancelCalls = [];

  require.cache[envPath] = {
    exports: {},
  };

  require.cache[prismaPath] = {
    exports: {
      order: {
        findUnique: async () => ({
          id: 31n,
          buyerId: 88,
          status: "PENDING_PAYMENT",
          sellerConfirmedReceivedMoney: false,
          seller: { ownerAccountId: 501 },
          payments: [{ id: 401n, method: "COD", status: "PENDING" }],
        }),
      },
      refund: {
        findFirst: async () => null,
      },
      seller: {
        findFirst: async () => null,
      },
    },
  };

  require.cache[paymentRepositoryPath] = {
    exports: {
      cancelPendingPaymentOrder: async (orderId, actorId, reason) => {
        cancelCalls.push({
          orderId: String(orderId),
          actorId,
          reason,
        });
        return { id: BigInt(orderId), status: "CANCELLED" };
      },
    },
  };

  delete require.cache[paymentServicePath];
  const paymentService = require(paymentServicePath);

  const result = await paymentService.refundOrder(88, 31, {
    reason: "Khach muon huy rieng seller-order COD nay",
  });

  assert.equal(cancelCalls.length, 1);
  assert.deepEqual(cancelCalls[0], {
    orderId: "31",
    actorId: 88,
    reason: "Khach muon huy rieng seller-order COD nay",
  });
  assert.equal(result.status, "CANCELLED");

  delete require.cache[envPath];
  delete require.cache[prismaPath];
  delete require.cache[paymentRepositoryPath];
  delete require.cache[paymentServicePath];
});
