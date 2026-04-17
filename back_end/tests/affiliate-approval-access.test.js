const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const affiliateRepositoryPath = path.resolve(__dirname, "../src/modules/affiliate/affiliate.repository.js");
const affiliateServicePath = path.resolve(__dirname, "../src/modules/affiliate/affiliate.service.js");
const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const affiliateMiddlewarePath = path.resolve(__dirname, "../src/middlewares/affiliate.middleware.js");

test("affiliate service blocks stats access for unapproved affiliates", async () => {
  require.cache[affiliateRepositoryPath] = {
    exports: {
      findAffiliate: async () => ({
        accountId: 11,
        kycStatus: "REJECTED",
      }),
    },
  };

  delete require.cache[affiliateServicePath];
  const affiliateService = require(affiliateServicePath);

  await assert.rejects(
    () => affiliateService.getStats(11),
    (error) => {
      assert.equal(error.message, "Affiliate account is not approved");
      assert.equal(error.statusCode, 403);
      return true;
    },
  );

  delete require.cache[affiliateRepositoryPath];
  delete require.cache[affiliateServicePath];
});

test("affiliate middleware rejects pending affiliates on approved-only routes", async () => {
  require.cache[prismaPath] = {
    exports: {
      affiliate: {
        findUnique: async () => ({
          accountId: 11,
          kycStatus: "PENDING",
        }),
      },
    },
  };

  delete require.cache[affiliateMiddlewarePath];
  const { requireApprovedAffiliate } = require(affiliateMiddlewarePath);

  const req = {
    user: {
      id: 11,
    },
  };

  let forwardedError = null;
  await requireApprovedAffiliate(req, {}, (error) => {
    forwardedError = error;
  });

  assert.equal(forwardedError?.message, "Affiliate account is not approved");
  assert.equal(forwardedError?.statusCode, 403);

  delete require.cache[prismaPath];
  delete require.cache[affiliateMiddlewarePath];
});
