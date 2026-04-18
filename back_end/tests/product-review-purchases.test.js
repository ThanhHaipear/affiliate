const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const productRepositoryPath = path.resolve(__dirname, "../src/modules/product/product.repository.js");

test("listProductReviews keeps review available when customer has another completed purchase left", async () => {
  require.cache[prismaPath] = {
    exports: {
      productReview: {
        findMany: async () => [],
        aggregate: async () => ({
          _count: { _all: 1 },
          _avg: { rating: 5 },
        }),
      },
      orderItem: {
        count: async ({ where }) => {
          if (where.productReview === null) {
            return 1;
          }

          return 2;
        },
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

  require.cache[prismaPath] = {
    exports: {
      orderItem: {
        findFirst: async ({ where }) => {
          capturedWhere = where;
          return {
            id: BigInt(321),
            order: {
              id: BigInt(1001),
              orderCode: "ORD-1001",
            },
            productReview: null,
          };
        },
      },
      productReview: {
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
          order: {
            id: BigInt(1001),
          },
          productReview: {
            id: BigInt(999),
          },
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
      assert.equal(error.message, "This purchase has already been reviewed");
      assert.equal(error.statusCode, 409);
      return true;
    },
  );

  delete require.cache[prismaPath];
  delete require.cache[productRepositoryPath];
});
