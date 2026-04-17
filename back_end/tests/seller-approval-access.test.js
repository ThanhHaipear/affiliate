const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const sellerRepositoryPath = path.resolve(__dirname, "../src/modules/seller/seller.repository.js");
const sellerServicePath = path.resolve(__dirname, "../src/modules/seller/seller.service.js");
const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const sellerMiddlewarePath = path.resolve(__dirname, "../src/middlewares/seller.middleware.js");

test("seller service blocks order access for unapproved sellers", async () => {
  require.cache[sellerRepositoryPath] = {
    exports: {
      findSellerByOwner: async () => ({
        id: 7,
        approvalStatus: "PENDING",
      }),
    },
  };

  delete require.cache[sellerServicePath];
  const sellerService = require(sellerServicePath);

  await assert.rejects(
    () => sellerService.listOrders(99),
    (error) => {
      assert.equal(error.message, "Seller account is not approved");
      assert.equal(error.statusCode, 403);
      return true;
    },
  );

  delete require.cache[sellerRepositoryPath];
  delete require.cache[sellerServicePath];
});

test("seller middleware rejects rejected sellers on approved-only routes", async () => {
  require.cache[prismaPath] = {
    exports: {
      seller: {
        findFirst: async () => ({
          id: 12,
          ownerAccountId: 5,
          approvalStatus: "REJECTED",
        }),
      },
    },
  };

  delete require.cache[sellerMiddlewarePath];
  const { requireApprovedSeller } = require(sellerMiddlewarePath);

  const req = {
    user: {
      id: 5,
    },
  };

  let forwardedError = null;
  await requireApprovedSeller(req, {}, (error) => {
    forwardedError = error;
  });

  assert.equal(forwardedError?.message, "Seller account is not approved");
  assert.equal(forwardedError?.statusCode, 403);

  delete require.cache[prismaPath];
  delete require.cache[sellerMiddlewarePath];
});
