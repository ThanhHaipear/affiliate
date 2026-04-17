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
  email: z.string().email("Email không hợp lệ."),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự."),
});

const registerCustomerBaseSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự."),
  email: z.string().email("Email không hợp lệ."),
  phone: z.string().min(10, "Số điện thoại không hợp lệ."),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự."),
  confirmPassword: z.string().min(8, "Xác nhận mật khẩu tối thiểu 8 ký tự."),
});

const withPasswordConfirmation = (schema) =>
  schema.refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  });

const registerCustomerSchema = withPasswordConfirmation(registerCustomerBaseSchema);

const registerPartnerBaseSchema = registerCustomerBaseSchema.extend({
  businessName: z.string().min(2, "Tên doanh nghiệp là bắt buộc."),
  paymentMethod: z.string().min(1, "Chọn phương thức thanh toán."),
  bankName: optionalText(2, "Tên ngân hàng là bắt buộc."),
  bankAccountName: z.string().min(2, "Tên chủ tài khoản là bắt buộc."),
  bankAccountNumber: optionalText(6, "Số tài khoản không hợp lệ."),
});

const registerSellerSchema = withPasswordConfirmation(
  registerPartnerBaseSchema.extend({
    shopName: z.string().min(2, "Tên shop là bắt buộc."),
  }),
);

const registerAffiliateSchema = withPasswordConfirmation(
  registerPartnerBaseSchema.extend({
    channelName: z.string().min(2, "Tên kênh là bắt buộc."),
  }).superRefine((data, ctx) => {
    if (isBankTransferMethod(data.paymentMethod)) {
      if (!data.bankName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tên ngân hàng là bắt buộc.", path: ["bankName"] });
      }
      if (!data.bankAccountNumber) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Số tài khoản không hợp lệ.", path: ["bankAccountNumber"] });
      }
    }
  }),
);

const affiliateEnrollmentSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự."),
  businessName: z.string().min(2, "Tên doanh nghiệp là bắt buộc."),
  channelName: z.string().min(2, "Tên kênh là bắt buộc."),
  paymentMethod: z.string().min(1, "Chọn phương thức thanh toán."),
  bankName: optionalText(2, "Tên ngân hàng là bắt buộc."),
  bankAccountName: z.string().min(2, "Tên chủ tài khoản là bắt buộc."),
  bankAccountNumber: optionalText(6, "Số tài khoản không hợp lệ."),
}).superRefine((data, ctx) => {
  if (isBankTransferMethod(data.paymentMethod)) {
    if (!data.bankName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Tên ngân hàng là bắt buộc.", path: ["bankName"] });
    }
    if (!data.bankAccountNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Số tài khoản không hợp lệ.", path: ["bankAccountNumber"] });
    }
  }
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ."),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự."),
  confirmPassword: z.string().min(8, "Xác nhận mật khẩu tối thiểu 8 ký tự."),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Mật khẩu xác nhận không khớp.",
  path: ["confirmPassword"],
});

export {
  affiliateEnrollmentSchema,
  forgotPasswordSchema,
  loginSchema,
  registerAffiliateSchema,
  registerCustomerSchema,
  registerSellerSchema,
  resetPasswordSchema,
};
