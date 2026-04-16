const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const prismaPath = path.resolve(__dirname, "../src/config/prisma.js");
const jwtPath = path.resolve(__dirname, "../src/utils/jwt.js");
const authMiddlewarePath = path.resolve(__dirname, "../src/middlewares/auth.middleware.js");
const authRepositoryPath = path.resolve(__dirname, "../src/modules/auth/auth.repository.js");
const authServicePath = path.resolve(__dirname, "../src/modules/auth/auth.service.js");

test("authenticate rejects locked account even with a valid access token", async () => {
  require.cache[prismaPath] = {
    exports: {
      account: {
        findUnique: async () => ({
          id: 7,
          email: "locked@example.com",
          phone: "0900000000",
          status: "LOCKED",
          accountRoles: [{ role: { code: "CUSTOMER" } }],
        }),
      },
    },
  };

  require.cache[jwtPath] = {
    exports: {
      verifyAccessToken: () => ({ sub: 7 }),
    },
  };

  delete require.cache[authMiddlewarePath];
  const { authenticate } = require(authMiddlewarePath);

  const req = {
    headers: {
      authorization: "Bearer valid-token",
    },
  };

  let forwardedError = null;
  await authenticate(req, {}, (error) => {
    forwardedError = error || null;
  });

  assert.equal(forwardedError?.message, "Account is not active");
  assert.equal(forwardedError?.statusCode, 401);
  assert.equal(req.user, undefined);

  delete require.cache[prismaPath];
  delete require.cache[jwtPath];
  delete require.cache[authMiddlewarePath];
});

test("refreshToken rejects non-active accounts", async () => {
  require.cache[authRepositoryPath] = {
    exports: {
      findAccountById: async () => ({
        id: 9,
        status: "LOCKED",
        accountRoles: [{ role: { code: "CUSTOMER" } }],
        customerProfile: null,
        affiliate: null,
      }),
    },
  };

  require.cache[jwtPath] = {
    exports: {
      signAccessToken: () => "access-token",
      signRefreshToken: () => "refresh-token",
      verifyRefreshToken: () => ({ sub: 9 }),
    },
  };

  delete require.cache[authServicePath];
  const authService = require(authServicePath);

  await assert.rejects(
    () => authService.refreshToken({ refreshToken: "valid-refresh-token" }),
    (error) => {
      assert.equal(error.message, "Account is not active");
      assert.equal(error.statusCode, 401);
      return true;
    },
  );

  delete require.cache[authRepositoryPath];
  delete require.cache[jwtPath];
  delete require.cache[authServicePath];
});
