const test = require("node:test");
const assert = require("node:assert/strict");

const cartRepository = require("../src/modules/cart/cart.repository");

test("buildCartItemIdentityWhere keeps direct and affiliate cart items separate", () => {
  const directIdentity = cartRepository.__private.buildCartItemIdentityWhere(1n, 99, null);
  const affiliateIdentity = cartRepository.__private.buildCartItemIdentityWhere(1n, 99, {
    id: 7n,
    affiliateId: 123,
    affiliateLinkId: 88n,
  });

  assert.deepEqual(directIdentity, {
    cartId: 1n,
    variantId: 99,
    affiliateId: null,
    attributionSessionId: null,
    affiliateLinkId: null,
  });

  assert.deepEqual(affiliateIdentity, {
    cartId: 1n,
    variantId: 99,
    affiliateId: 123,
    attributionSessionId: 7n,
    affiliateLinkId: 88n,
  });
});
