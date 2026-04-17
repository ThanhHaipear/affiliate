const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const authRepositoryPath = path.resolve(__dirname, "../src/modules/auth/auth.repository.js");
const jwtPath = path.resolve(__dirname, "../src/utils/jwt.js");
const envPath = path.resolve(__dirname, "../src/config/env.js");
const mailerPath = path.resolve(__dirname, "../src/utils/mailer.js");
const passwordResetPath = path.resolve(__dirname, "../src/utils/password-reset.js");
const authServicePath = path.resolve(__dirname, "../src/modules/auth/auth.service.js");

test("forgotPassword creates a reset token and sends email for an existing account", async () => {
  const calls = [];

  require.cache[authRepositoryPath] = {
    exports: {
      findAccountByEmail: async () => ({
        id: 15,
        email: "user@example.com",
      }),
      invalidatePasswordResetTokens: async (accountId) => {
        calls.push(["invalidate", accountId]);
      },
      createPasswordResetToken: async (payload) => {
        calls.push(["create", payload]);
      },
    },
  };

  require.cache[jwtPath] = {
    exports: {
      signAccessToken: () => "access-token",
      signRefreshToken: () => "refresh-token",
      verifyRefreshToken: () => ({ sub: 15 }),
    },
  };

  require.cache[envPath] = {
    exports: {
      passwordResetTokenTtlMinutes: 30,
      passwordResetUrl: "http://localhost:5173/auth/reset-password",
      frontendBaseUrl: "http://localhost:5173",
    },
  };

  require.cache[mailerPath] = {
    exports: {
      isMailerConfigured: () => true,
      sendPasswordResetEmail: async (payload) => {
        calls.push(["sendMail", payload]);
      },
    },
  };

  require.cache[passwordResetPath] = {
    exports: {
      generatePasswordResetToken: () => "plain-reset-token",
      hashPasswordResetToken: () => "hashed-reset-token",
    },
  };

  delete require.cache[authServicePath];
  const authService = require(authServicePath);

  const result = await authService.forgotPassword({ email: "user@example.com" });

  assert.deepEqual(result, {
    resetRequested: true,
    delivery: "email",
  });
  assert.deepEqual(calls[0], ["invalidate", 15]);
  assert.equal(calls[1][0], "create");
  assert.equal(calls[1][1].accountId, 15);
  assert.equal(calls[1][1].tokenHash, "hashed-reset-token");
  assert.equal(calls[2][0], "sendMail");
  assert.equal(calls[2][1].toEmail, "user@example.com");
  assert.match(calls[2][1].resetUrl, /plain-reset-token/);

  delete require.cache[authRepositoryPath];
  delete require.cache[jwtPath];
  delete require.cache[envPath];
  delete require.cache[mailerPath];
  delete require.cache[passwordResetPath];
  delete require.cache[authServicePath];
});

test("resetPasswordWithToken changes password and consumes the token", async () => {
  const calls = [];

  require.cache[authRepositoryPath] = {
    exports: {
      findActivePasswordResetToken: async () => ({
        id: BigInt(9),
        accountId: 15,
        account: {
          email: "user@example.com",
        },
      }),
      changePassword: async (accountId, passwordHash) => {
        calls.push(["changePassword", accountId, passwordHash]);
      },
      consumePasswordResetToken: async (id) => {
        calls.push(["consume", id]);
      },
      invalidatePasswordResetTokens: async (accountId) => {
        calls.push(["invalidate", accountId]);
      },
    },
  };

  require.cache[jwtPath] = {
    exports: {
      signAccessToken: () => "access-token",
      signRefreshToken: () => "refresh-token",
      verifyRefreshToken: () => ({ sub: 15 }),
    },
  };

  require.cache[envPath] = {
    exports: {
      passwordResetTokenTtlMinutes: 30,
      passwordResetUrl: "http://localhost:5173/auth/reset-password",
      frontendBaseUrl: "http://localhost:5173",
    },
  };

  require.cache[mailerPath] = {
    exports: {
      isMailerConfigured: () => true,
      sendPasswordResetEmail: async () => {},
    },
  };

  require.cache[passwordResetPath] = {
    exports: {
      generatePasswordResetToken: () => "plain-reset-token",
      hashPasswordResetToken: () => "hashed-reset-token",
    },
  };

  delete require.cache[authServicePath];
  const authService = require(authServicePath);

  const result = await authService.resetPasswordWithToken({
    token: "plain-reset-token",
    newPassword: "12345678",
  });

  assert.deepEqual(result, { reset: true });
  assert.equal(calls[0][0], "changePassword");
  assert.equal(calls[0][1], 15);
  assert.ok(typeof calls[0][2] === "string" && calls[0][2].length > 10);
  assert.deepEqual(calls[1], ["consume", BigInt(9)]);
  assert.deepEqual(calls[2], ["invalidate", 15]);

  delete require.cache[authRepositoryPath];
  delete require.cache[jwtPath];
  delete require.cache[envPath];
  delete require.cache[mailerPath];
  delete require.cache[passwordResetPath];
  delete require.cache[authServicePath];
});
