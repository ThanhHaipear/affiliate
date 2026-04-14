import { aggregateDisplayCartItems, mapCartItemDto } from "./apiMappers";

describe("cart attribution grouping", () => {
  it("groups direct and affiliate allocations of the same product into one display block", () => {
    const directItem = mapCartItemDto({
      id: 1,
      quantity: 1,
      variantId: 101,
      product: {
        id: 10,
        name: "Sản phẩm A",
        basePrice: 100000,
        seller: { shopName: "Shop A" },
        variants: [{ id: 101, price: 100000, inventory: { quantity: 10, reservedQuantity: 0 } }],
      },
      variant: { id: 101, price: 100000, variantName: "Mặc định" },
      createdAt: "2026-04-14T10:00:00.000Z",
      updatedAt: "2026-04-14T10:00:00.000Z",
    });

    const affiliateItem = mapCartItemDto({
      id: 2,
      quantity: 2,
      variantId: 101,
      affiliateId: 999,
      affiliateLinkId: 555,
      attributionSessionId: 777,
      product: {
        id: 10,
        name: "Sản phẩm A",
        basePrice: 100000,
        seller: { shopName: "Shop A" },
        variants: [{ id: 101, price: 100000, inventory: { quantity: 10, reservedQuantity: 0 } }],
      },
      variant: { id: 101, price: 100000, variantName: "Mặc định" },
      createdAt: "2026-04-14T11:00:00.000Z",
      updatedAt: "2026-04-14T11:00:00.000Z",
    });

    const groups = aggregateDisplayCartItems([directItem, affiliateItem]);

    expect(groups).toHaveLength(1);
    expect(groups[0].quantity).toBe(3);
    expect(groups[0].hasAffiliateAttributed).toBe(true);
    expect(groups[0].allocations).toHaveLength(2);
    expect(groups[0].allocations[0].isAffiliateAttributed).toBe(true);
    expect(groups[0].allocations[1].isAffiliateAttributed).toBe(false);
  });
});
