import { affiliateSettingSchema, productSchema } from "./productSchemas";

describe("product schemas", () => {
  it("accepts valid product input", () => {
    const result = productSchema.safeParse({
      name: "Product",
      description: "A valid long description",
      price: 100000,
      category: "Digital",
      stock: 10,
      commission_type: "PERCENT",
      commission_value: 10,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid price", () => {
    const result = productSchema.safeParse({
      name: "Product",
      description: "A valid long description",
      price: 0,
      category: "Digital",
      stock: 10,
      commission_type: "PERCENT",
      commission_value: 10,
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid commission value", () => {
    const result = affiliateSettingSchema.safeParse({
      product_id: "prod-1",
      commission_type: "PERCENT",
      commission_value: 0,
    });

    expect(result.success).toBe(false);
  });
});
