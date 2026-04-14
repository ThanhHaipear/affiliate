import { z } from "zod";

const normalizeOptionalText = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : "";
};

const normalizePaymentType = (value = "") => String(value || "").trim().toUpperCase();
const isBankTransferMethod = (value = "") => normalizePaymentType(value) === "BANK_TRANSFER";

const affiliateProfileFormSchema = z
  .object({
    fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự."),
    phone: z.preprocess(normalizeOptionalText, z.union([z.literal(""), z.string().min(8, "Số điện thoại tối thiểu 8 ký tự.")]).default("")),
    avatarUrl: z.preprocess(normalizeOptionalText, z.union([z.literal(""), z.string().url("Avatar URL không hợp lệ.")]).default("")),
    channelPlatform: z.preprocess(normalizeOptionalText, z.string().default("")),
    channelUrl: z.preprocess(normalizeOptionalText, z.union([z.literal(""), z.string().url("URL kênh không hợp lệ.")]).default("")),
    channelDescription: z.preprocess(normalizeOptionalText, z.string().default("")),
    paymentType: z.preprocess(normalizeOptionalText, z.string().default("")),
    paymentAccountName: z.preprocess(normalizeOptionalText, z.string().default("")),
    paymentAccountNumber: z.preprocess(normalizeOptionalText, z.string().default("")),
    paymentBankName: z.preprocess(normalizeOptionalText, z.string().default("")),
    paymentBranch: z.preprocess(normalizeOptionalText, z.string().default("")),
  })
  .superRefine((value, ctx) => {
    const hasChannelInput = Boolean(value.channelPlatform || value.channelUrl || value.channelDescription);
    if (hasChannelInput) {
      if (!value.channelPlatform) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["channelPlatform"],
          message: "Nền tảng kênh là bắt buộc khi bạn khai báo kênh quảng bá.",
        });
      }

      if (!value.channelUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["channelUrl"],
          message: "URL kênh là bắt buộc khi bạn khai báo kênh quảng bá.",
        });
      }
    }

    const hasPaymentInput = Boolean(
      value.paymentType
        || value.paymentAccountName
        || value.paymentAccountNumber
        || value.paymentBankName
        || value.paymentBranch,
    );

    if (hasPaymentInput) {
      if (!value.paymentType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentType"],
          message: "Phương thức thanh toán là bắt buộc.",
        });
      }

      if (!value.paymentAccountName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentAccountName"],
          message: "Tên chủ tài khoản là bắt buộc.",
        });
      }

      if (!value.paymentAccountNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentAccountNumber"],
          message: "Số tài khoản hoặc mã thanh toán là bắt buộc.",
        });
      }

      if (isBankTransferMethod(value.paymentType) && !value.paymentBankName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentBankName"],
          message: "Tên ngân hàng là bắt buộc khi chọn chuyển khoản ngân hàng.",
        });
      }
    }
  });

const affiliateChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, "Mật khẩu hiện tại tối thiểu 6 ký tự."),
    newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự."),
    confirmPassword: z.string().min(6, "Bạn cần xác nhận lại mật khẩu mới."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Mật khẩu xác nhận phải khớp.",
    path: ["confirmPassword"],
  });

const affiliateCreateLinkSchema = z.object({
  trafficSource: z.string().min(2, "Nguồn traffic là bắt buộc."),
  campaignTag: z.string().optional(),
});

const affiliatePaymentAccountSchema = z.object({
  type: z.string().min(2, "Loại tài khoản là bắt buộc."),
  accountName: z.string().min(2, "Tên chủ tài khoản là bắt buộc."),
  accountNumber: z.string().min(6, "Số tài khoản không hợp lệ."),
  bankName: z.string().min(2, "Tên ngân hàng là bắt buộc."),
  branch: z.string().optional(),
  makeDefault: z.boolean().optional(),
});

export {
  affiliateChangePasswordSchema,
  affiliateCreateLinkSchema,
  affiliatePaymentAccountSchema,
  affiliateProfileFormSchema,
};
