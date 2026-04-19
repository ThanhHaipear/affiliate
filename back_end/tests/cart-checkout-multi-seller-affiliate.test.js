const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const codePath = path.resolve(__dirname, "../src/utils/code.js");
const cartRepositoryPath = path.resolve(__dirname, "../src/modules/cart/cart.repository.js");

test("checkout splits multi-seller orders and preserves direct plus affiliate attribution for commission", async () => {
  const createdOrders = [];
  const createdOrderItems = [];
  const createdAffiliateCommissions = [];
  const createdAffiliateCommissionItems = [];
  const createdPayments = [];
  const orderItemsByOrderId = new Map();
  const paymentsByOrderId = new Map();
  const inventoryUpdates = [];
  const deletedCartItemPayloads = [];

  let nextOrderId = 7000n;
  let nextOrderItemId = 9000n;
  let nextCommissionId = 11000n;

  const tx = {
    platformFeeConfig: {
      findFirst: async () => ({
        feeValue: BigInt(10),
      }),
    },
    cart: {
      findFirst: async () => ({
        id: 501n,
        items: [
          {
            id: 1001n,
            productId: 2001,
            variantId: 3001,
            quantity: 1,
            affiliateId: null,
            attributionSessionId: null,
            affiliateLinkId: null,
            product: {
              id: 2001,
              name: "San pham X",
              sellerId: 801,
              affiliateSetting: { commissionValue: BigInt(20) },
            },
            variant: {
              id: 3001,
              variantName: "Mac dinh",
              sku: "SKU-X",
              price: BigInt(100000),
              inventory: {
                quantity: 20,
                reservedQuantity: 0,
              },
            },
          },
          {
            id: 1002n,
            productId: 2001,
            variantId: 3001,
            quantity: 2,
            affiliateId: 901,
            attributionSessionId: 9101n,
            affiliateLinkId: 9201n,
            product: {
              id: 2001,
              name: "San pham X",
              sellerId: 801,
              affiliateSetting: { commissionValue: BigInt(20) },
            },
            variant: {
              id: 3001,
              variantName: "Mac dinh",
              sku: "SKU-X",
              price: BigInt(100000),
              inventory: {
                quantity: 20,
                reservedQuantity: 0,
              },
            },
          },
          {
            id: 1003n,
            productId: 2002,
            variantId: 3002,
            quantity: 3,
            affiliateId: 902,
            attributionSessionId: 9102n,
            affiliateLinkId: 9202n,
            product: {
              id: 2002,
              name: "San pham Y",
              sellerId: 802,
              affiliateSetting: { commissionValue: BigInt(15) },
            },
            variant: {
              id: 3002,
              variantName: "Loai B",
              sku: "SKU-Y",
              price: BigInt(50000),
              inventory: {
                quantity: 20,
                reservedQuantity: 0,
              },
            },
          },
        ],
      }),
    },
    inventory: {
      findUnique: async ({ where }) => {
        if (String(where.variantId) === "3001") {
          return { quantity: 20, reservedQuantity: 0 };
        }
        if (String(where.variantId) === "3002") {
          return { quantity: 20, reservedQuantity: 0 };
        }
        return null;
      },
      update: async ({ where, data }) => {
        inventoryUpdates.push({
          variantId: String(where.variantId),
          reservedQuantity: data.reservedQuantity,
        });
        return { id: where.variantId, ...data };
      },
    },
    inventoryTransaction: {
      create: async () => ({}),
    },
    order: {
      create: async ({ data }) => {
        const order = {
          id: nextOrderId,
          ...data,
        };
        nextOrderId += 1n;
        createdOrders.push(order);
        return order;
      },
      findMany: async ({ where }) =>
        createdOrders
          .filter((order) => where.id.in.some((id) => String(id) === String(order.id)))
          .map((order) => ({
            ...order,
            items: orderItemsByOrderId.get(String(order.id)) || [],
            payments: paymentsByOrderId.get(String(order.id)) || [],
          })),
    },
    orderItem: {
      create: async ({ data }) => {
        const orderItem = {
          id: nextOrderItemId,
          ...data,
        };
        nextOrderItemId += 1n;
        createdOrderItems.push(orderItem);

        const key = String(data.orderId);
        const items = orderItemsByOrderId.get(key) || [];
        items.push(orderItem);
        orderItemsByOrderId.set(key, items);

        return orderItem;
      },
    },
    affiliateCommission: {
      create: async ({ data }) => {
        const commission = {
          id: nextCommissionId,
          ...data,
        };
        nextCommissionId += 1n;
        createdAffiliateCommissions.push(commission);
        return commission;
      },
    },
    affiliateCommissionItem: {
      createMany: async ({ data }) => {
        createdAffiliateCommissionItems.push(...data);
        return { count: data.length };
      },
    },
    payment: {
      create: async ({ data }) => {
        const payment = { id: BigInt(createdPayments.length + 1), ...data };
        createdPayments.push(payment);

        const key = String(data.orderId);
        const payments = paymentsByOrderId.get(key) || [];
        payments.push(payment);
        paymentsByOrderId.set(key, payments);

        return payment;
      },
    },
    orderStatusHistory: {
      create: async () => ({}),
    },
    cartItem: {
      deleteMany: async ({ where }) => {
        deletedCartItemPayloads.push(where);
        return { count: 3 };
      },
    },
    $queryRaw: async () => ([
      {
        id: 77n,
        recipientName: "Nguyen Van A",
        phone: "0900000000",
        province: "HCM",
        district: "Thu Duc",
        ward: "Linh Trung",
        detail: "So 1",
      },
    ]),
    $executeRaw: async () => 1,
  };

  require.cache[codePath] = {
    exports: {
      generateOrderCode: () => "ORD-GROUP-TEST",
    },
  };

  require.cache[prismaPath] = {
    exports: {
      $transaction: async (callback) => callback(tx),
    },
  };

  delete require.cache[cartRepositoryPath];
  const cartRepository = require(cartRepositoryPath);

  const result = await cartRepository.checkout(123, {
    addressId: 77,
    buyerName: "Nguyen Van A",
    buyerPhone: "0900000000",
    buyerEmail: "buyer@example.com",
    shippingFee: 30000,
    discountAmount: 60000,
    paymentMethod: "VNPAY",
    shippingMethod: "EXPRESS",
    selectedItemIds: [1001, 1002, 1003],
  });

  assert.equal(result.orderCode, "ORD-GROUP-TEST");
  assert.equal(result.totalOrders, 2);
  assert.equal(result.totalShippingFee, 60000);
  assert.equal(createdOrders.length, 2);

  const seller801Order = createdOrders.find((order) => order.sellerId === 801);
  const seller802Order = createdOrders.find((order) => order.sellerId === 802);

  assert.ok(seller801Order);
  assert.ok(seller802Order);
  assert.equal(Number(seller801Order.subtotal), 300000);
  assert.equal(Number(seller802Order.subtotal), 150000);
  assert.equal(Number(seller801Order.discountAmount), 40000);
  assert.equal(Number(seller802Order.discountAmount), 20000);
  assert.equal(Number(seller801Order.shippingFee), 30000);
  assert.equal(Number(seller802Order.shippingFee), 30000);
  assert.equal(Number(seller801Order.totalAmount), 290000);
  assert.equal(Number(seller802Order.totalAmount), 160000);

  const seller801Items = createdOrderItems.filter((item) => String(item.orderId) === String(seller801Order.id));
  const seller802Items = createdOrderItems.filter((item) => String(item.orderId) === String(seller802Order.id));

  assert.equal(seller801Items.length, 2);
  assert.equal(seller802Items.length, 1);

  const directItem = seller801Items.find((item) => item.affiliateId == null);
  const affiliateItemA = seller801Items.find((item) => item.affiliateId === 901);
  const affiliateItemB = seller802Items.find((item) => item.affiliateId === 902);

  assert.ok(directItem);
  assert.ok(affiliateItemA);
  assert.ok(affiliateItemB);

  assert.equal(Number(directItem.lineTotal), 100000);
  assert.equal(Number(directItem.commissionAmount), 0);
  assert.equal(Number(directItem.platformFeeAmount), 10000);
  assert.equal(Number(directItem.sellerNetAmount), 90000);

  assert.equal(Number(affiliateItemA.lineTotal), 200000);
  assert.equal(Number(affiliateItemA.commissionAmount), 40000);
  assert.equal(Number(affiliateItemA.platformFeeAmount), 20000);
  assert.equal(Number(affiliateItemA.sellerNetAmount), 140000);
  assert.equal(String(affiliateItemA.attributionSessionId), "9101");
  assert.equal(String(affiliateItemA.affiliateLinkId), "9201");

  assert.equal(Number(affiliateItemB.lineTotal), 150000);
  assert.equal(Number(affiliateItemB.commissionAmount), 22500);
  assert.equal(Number(affiliateItemB.platformFeeAmount), 15000);
  assert.equal(Number(affiliateItemB.sellerNetAmount), 112500);
  assert.equal(String(affiliateItemB.attributionSessionId), "9102");
  assert.equal(String(affiliateItemB.affiliateLinkId), "9202");

  assert.equal(createdAffiliateCommissions.length, 2);

  const affiliateCommissionA = createdAffiliateCommissions.find((item) => item.affiliateId === 901);
  const affiliateCommissionB = createdAffiliateCommissions.find((item) => item.affiliateId === 902);

  assert.equal(Number(affiliateCommissionA.totalCommission), 40000);
  assert.equal(Number(affiliateCommissionB.totalCommission), 22500);
  assert.equal(createdAffiliateCommissionItems.length, 2);

  assert.equal(createdPayments.length, 2);
  assert.equal(Number(createdPayments.find((item) => String(item.orderId) === String(seller801Order.id)).amount), 290000);
  assert.equal(Number(createdPayments.find((item) => String(item.orderId) === String(seller802Order.id)).amount), 160000);

  assert.equal(inventoryUpdates.length, 3);
  assert.deepEqual(
    inventoryUpdates.map((item) => item.reservedQuantity),
    [1, 2, 3],
  );

  assert.equal(deletedCartItemPayloads.length, 1);
  assert.deepEqual(
    deletedCartItemPayloads[0].id.in.map((value) => String(value)),
    ["1001", "1002", "1003"],
  );

  delete require.cache[prismaPath];
  delete require.cache[codePath];
  delete require.cache[cartRepositoryPath];
});
