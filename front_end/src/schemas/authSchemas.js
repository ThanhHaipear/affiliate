import { z } from "zod";

const emptyToUndefined = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const optionalText = (min, message) => z.preprocess(emptyToUndefined, z.string().min(min, message).optional());
const normalizePaymentMethod = (value = "") => String(value).trim().toUpperCase();
const isBankTransferMethod = (value = "") => normalizePaymentMethod(value) === "BANK_TRANSFER";

const loginSchema = z.object({
  email: z.string().email("Email khong hop le."),
  password: z.string().min(6, "Mat khau toi thieu 6 ky tu."),
});

const registerCustomerBaseSchema = z.object({
  fullName: z.string().min(2, "Ho ten toi thieu 2 ky tu."),
  email: z.string().email("Email khong hop le."),
  phone: z.string().min(10, "So dien thoai khong hop le."),
  password: z.string().min(8, "Mat khau toi thieu 8 ky tu."),
  confirmPassword: z.string().min(8, "Xac nhan mat khau toi thieu 8 ky tu."),
});

const withPasswordConfirmation = (schema) =>
  schema.refine((data) => data.password === data.confirmPassword, {
    message: "Mat khau xac nhan khong khop.",
    path: ["confirmPassword"],
  });

const registerCustomerSchema = withPasswordConfirmation(registerCustomerBaseSchema);

const registerPartnerBaseSchema = registerCustomerBaseSchema.extend({
  businessName: z.string().min(2, "Ten business la bat buoc."),
  paymentMethod: z.string().min(1, "Chon phuong thuc thanh toan."),
  bankName: optionalText(2, "Ten ngan hang la bat buoc."),
  bankAccountName: z.string().min(2, "Ten chu tai khoan la bat buoc."),
  bankAccountNumber: optionalText(6, "So tai khoan khong hop le."),
});

const registerSellerSchema = withPasswordConfirmation(
  registerPartnerBaseSchema.extend({
    shopName: z.string().min(2, "Ten shop la bat buoc."),
  }),
);

const registerAffiliateSchema = withPasswordConfirmation(
  registerPartnerBaseSchema.extend({
    channelName: z.string().min(2, "Ten kenh la bat buoc."),
  }).superRefine((data, ctx) => {
    if (isBankTransferMethod(data.paymentMethod)) {
      if (!data.bankName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ten ngan hang la bat buoc.", path: ["bankName"] });
      }
      if (!data.bankAccountNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "So tai khoan khong hop le.", path: ["bankAccountNumber"] });
      }
    }
  }),
);

const affiliateEnrollmentSchema = z.object({
  fullName: z.string().min(2, "Ho ten toi thieu 2 ky tu."),
  businessName: z.string().min(2, "Ten business la bat buoc."),
  channelName: z.string().min(2, "Ten kenh la bat buoc."),
  paymentMethod: z.string().min(1, "Chon phuong thuc thanh toan."),
  bankName: optionalText(2, "Ten ngan hang la bat buoc."),
  bankAccountName: z.string().min(2, "Ten chu tai khoan la bat buoc."),
  bankAccountNumber: optionalText(6, "So tai khoan khong hop le."),
}).superRefine((data, ctx) => {
  if (isBankTransferMethod(data.paymentMethod)) {
    if (!data.bankName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ten ngan hang la bat buoc.", path: ["bankName"] });
    }
    if (!data.bankAccountNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "So tai khoan khong hop le.", path: ["bankAccountNumber"] });
    }
  }
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Email khong hop le."),
  newPassword: z.string().min(8, "Mat khau moi toi thieu 8 ky tu."),
  confirmPassword: z.string().min(8, "Xac nhan mat khau toi thieu 8 ky tu."),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mat khau xac nhan khong khop.",
  path: ["confirmPassword"],
});

export {
  affiliateEnrollmentSchema,
  forgotPasswordSchema,
  loginSchema,
  registerAffiliateSchema,
  registerCustomerSchema,
  registerSellerSchema,
};
