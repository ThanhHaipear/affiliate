import {
  forgotPasswordSchema,
  loginSchema,
  registerAffiliateSchema,
  registerCustomerSchema,
  registerSellerSchema,
  resetPasswordSchema,
} from "./authSchemas";

describe("auth schemas", () => {
  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({
      email: "admin.test@example.com",
      password: "123456",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid customer registration", () => {
    const result = registerCustomerSchema.safeParse({
      fullName: "A",
      email: "bad-email",
      phone: "123",
      password: "123",
      confirmPassword: "321",
    });

    expect(result.success).toBe(false);
  });

  it("requires payment account for seller", () => {
    const result = registerSellerSchema.safeParse({
      fullName: "Seller One",
      email: "seller@example.com",
      phone: "0901234567",
      password: "12345678",
      confirmPassword: "12345678",
      businessName: "Seller Business",
      shopName: "Seller Shop",
      paymentMethod: "",
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
    });

    expect(result.success).toBe(false);
  });

  it("requires payment account for affiliate", () => {
    const result = registerAffiliateSchema.safeParse({
      fullName: "Affiliate One",
      email: "affiliate@example.com",
      phone: "0901234567",
      password: "12345678",
      confirmPassword: "12345678",
      businessName: "Affiliate Business",
      channelName: "Channel",
      paymentMethod: "",
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid forgot password input", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "user@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("requires matching reset password confirmation", () => {
    const result = resetPasswordSchema.safeParse({
      newPassword: "12345678",
      confirmPassword: "87654321",
    });

    expect(result.success).toBe(false);
  });
});
