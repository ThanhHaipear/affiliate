import {
  affiliateProfileSchema,
  customerProfileSchema,
  paymentAccountSchema,
  sellerProfileSchema,
} from "./profileSchemas";

describe("profile schemas", () => {
  it("accepts valid payment account", () => {
    expect(
      paymentAccountSchema.safeParse({
        bankName: "VCB",
        bankAccountName: "User One",
        bankAccountNumber: "123456789",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid seller profile", () => {
    expect(
      sellerProfileSchema.safeParse({
        shopName: "A",
        contactEmail: "bad-email",
        phone: "123",
        kycStatus: "",
        paymentAccount: {},
      }).success,
    ).toBe(false);
  });

  it("rejects invalid affiliate profile", () => {
    expect(
      affiliateProfileSchema.safeParse({
        channelName: "",
        niche: "",
        contactEmail: "bad-email",
        paymentAccount: {},
      }).success,
    ).toBe(false);
  });

  it("accepts valid customer profile", () => {
    expect(
      customerProfileSchema.safeParse({
        fullName: "Customer One",
        phone: "0901234567",
      }).success,
    ).toBe(true);
  });
});
