const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const productRepositoryPath = path.resolve(__dirname, "../src/modules/product/product.repository.js");

test("listProductReviews keeps review available when customer has another completed purchase left", async () => {
  require.cache[prismaPath] = {
    exports: {
      order: {
        findMany: async () => ([
          {
            id: BigInt(101),
            items: [
              {
                id: BigInt(201),
                productReview: { id: BigInt(1) },
              },
            ],
          },
          {
            id: BigInt(102),
            items: [
              {
                id: BigInt(202),
                productReview: null,
              },
            ],
          },
        ]),
      },
      productReview: {
        findMany: async () => [],
        aggregate: async () => ({
          _count: { _all: 1 },
          _avg: { rating: 5 },
        }),
      },
    },
  };

  delete require.cache[productRepositoryPath];
  const productRepository = require(productRepositoryPath);

  const response = await productRepository.listProductReviews(5, {
    id: 88,
    roles: ["CUSTOMER"],
  });

  assert.equal(response.viewer.hasPurchased, true);
  assert.equal(response.viewer.hasReviewed, true);
  assert.equal(response.viewer.completedPurchaseCount, 2);
  assert.equal(response.viewer.reviewedPurchaseCount, 1);
  assert.equal(response.viewer.remainingReviewCount, 1);
  assert.equal(response.viewer.canReview, true);

  delete require.cache[prismaPath];
  delete require.cache[productRepositoryPath];
});

test("createProductReview binds review to the requested completed order item", async () => {
  let capturedWhere = null;
  let createdPayload = null;
  let findExistingReviewWhere = null;

  require.cache[prismaPath] = {
    exports: {
      orderItem: {
        findFirst: async ({ where }) => {
          capturedWhere = where;
          return {
            id: BigInt(321),
            orderId: BigInt(1001),
            order: {
              id: BigInt(1001),
              orderCode: "ORD-1001",
            },
            productReview: null,
          };
        },
      },
      productReview: {
        findFirst: async ({ where }) => {
          findExistingReviewWhere = where;
          return null;
        },
        create: async ({ data }) => {
          createdPayload = data;
          return {
            id: BigInt(777),
          };
        },
        findUnique: async () => ({
          id: BigInt(777),
          rating: 5,
          comment: "Great",
          account: {
            customerProfile: {
              fullName: "Tester",
            },
          },
          orderItem: {
            order: {
              orderCode: "ORD-1001",
            },
          },
        }),
      },
    },
  };

  delete require.cache[productRepositoryPath];
  const productRepository = require(productRepositoryPath);

  const response = await productRepository.createProductReview(9, 5, {
    rating: 5,
    comment: "Great",
    orderItemId: 321,
  });

  assert.equal(String(capturedWhere.id), "321");
  assert.equal(capturedWhere.productId, 5);
  assert.equal(capturedWhere.order.buyerId, 9);
  assert.equal(capturedWhere.order.status, "COMPLETED");
  assert.equal(findExistingReviewWhere.productId, 5);
  assert.equal(findExistingReviewWhere.accountId, 9);
  assert.equal(String(findExistingReviewWhere.orderItem.orderId), "1001");
  assert.equal(String(createdPayload.orderItemId), "321");
  assert.equal(response.orderItem.order.orderCode, "ORD-1001");

  delete require.cache[prismaPath];
  delete require.cache[productRepositoryPath];
});

test("createProductReview rejects when the requested purchase was already reviewed", async () => {
  require.cache[prismaPath] = {
    exports: {
      orderItem: {
        findFirst: async () => ({
          id: BigInt(321),
          orderId: BigInt(1001),
          order: {
            id: BigInt(1001),
          },
          productReview: null,
        }),
      },
      productReview: {
        findFirst: async () => ({
          id: BigInt(999),
        }),
      },
    },
  };

  delete require.cache[productRepositoryPath];
  const productRepository = require(productRepositoryPath);

  await assert.rejects(
    () =>
      productRepository.createProductReview(9, 5, {
        rating: 5,
        comment: "Great",
        orderItemId: 321,
      }),
    (error) => {
      assert.equal(error.message, "This product has already been reviewed for this order");
      assert.equal(error.statusCode, 409);
      return true;
    },
  );

  delete require.cache[prismaPath];
  delete require.cache[productRepositoryPath];
});
