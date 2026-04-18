const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const productRepositoryPath = path.resolve(__dirname, "../src/modules/product/product.repository.js");

test("public product queries exclude locked sellers from marketplace results", async () => {
  let capturedWhere = null;

  require.cache[prismaPath] = {
    exports: {
      product: {
        findMany: async ({ where }) => {
          capturedWhere = where;
          return [];
        },
      },
      orderItem: {
        groupBy: async () => [],
      },
      productReview: {
        groupBy: async () => [],
      },
    },
  };

  delete require.cache[productRepositoryPath];
  const productRepository = require(productRepositoryPath);

  const products = await productRepository.listApprovedProducts();

  assert.deepEqual(products, []);
  assert.equal(capturedWhere?.seller?.approvalStatus, "APPROVED");
  assert.equal(capturedWhere?.seller?.lockedAt, null);

  delete require.cache[prismaPath];
  delete require.cache[productRepositoryPath];
});

test("public product detail query excludes locked sellers", async () => {
  let capturedWhere = null;

  require.cache[prismaPath] = {
    exports: {
      product: {
        findFirst: async ({ where }) => {
          capturedWhere = where;
          return null;
        },
      },
    },
  };

  delete require.cache[productRepositoryPath];
  const productRepository = require(productRepositoryPath);

  const product = await productRepository.findApprovedProductById(42);

  assert.equal(product, null);
  assert.equal(capturedWhere?.seller?.approvalStatus, "APPROVED");
  assert.equal(capturedWhere?.seller?.lockedAt, null);

  delete require.cache[prismaPath];
  delete require.cache[productRepositoryPath];
});
