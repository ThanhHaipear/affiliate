import { withdrawalRequestSchema } from "./payoutSchemas";

describe("payout schemas", () => {
  it("accepts valid withdrawal request", () => {
    const result = withdrawalRequestSchema.safeParse({
      amount: 100000,
    });

    expect(result.success).toBe(true);
  });

  it("rejects amount less than or equal to zero", () => {
    const result = withdrawalRequestSchema.safeParse({
      amount: 0,
    });

    expect(result.success).toBe(false);
  });
});
