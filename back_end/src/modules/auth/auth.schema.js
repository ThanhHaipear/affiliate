const { z } = require("zod");

const emptyToUndefined = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const optionalText = (min) => z.preprocess(emptyToUndefined, z.string().min(min).optional());
const normalizePaymentMethod = (value = "") => String(value).trim().toUpperCase();
const isBankTransferMethod = (value = "") => normalizePaymentMethod(value) === "BANK_TRANSFER";

const registerBodySchema = z.object({
  email: z.string().email(),
  phone: z.string().min(8).optional(),
  password: z.string().min(6),
  role: z.enum(["SELLER", "CUSTOMER"]),
  fullName: z.string().min(2),
  shopName: z.string().min(2).optional(),
  businessName: z.string().min(2).optional(),
  channelName: z.string().min(2).optional(),
  paymentMethod: z.string().min(1).optional(),
  bankName: optionalText(2),
  bankAccountName: z.string().min(2).optional(),
  bankAccountNumber: optionalText(6),
}).superRefine((data, ctx) => {
  if (data.role === "SELLER") {
    if (!data.shopName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "shopName is required for SELLER", path: ["shopName"] });
    }
    if (!data.businessName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "businessName is required for SELLER", path: ["businessName"] });
    }
  }

  if (data.role === "AFFILIATE") {
    if (!data.businessName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "businessName is required for AFFILIATE", path: ["businessName"] });
    }
    if (!data.channelName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "channelName is required for AFFILIATE", path: ["channelName"] });
    }
  }

  if (data.role === "SELLER" || data.role === "AFFILIATE") {
    if (!data.paymentMethod) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "paymentMethod is required", path: ["paymentMethod"] });
    }
    if (!data.bankAccountName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bankAccountName is required", path: ["bankAccountName"] });
    }
  }

  if (data.role === "SELLER") {
    if (!data.bankName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bankName is required", path: ["bankName"] });
    }
    if (!data.bankAccountNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bankAccountNumber is required", path: ["bankAccountNumber"] });
    }
  }

  if (data.role === "AFFILIATE" && isBankTransferMethod(data.paymentMethod)) {
    if (!data.bankName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bankName is required", path: ["bankName"] });
    }
    if (!data.bankAccountNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bankAccountNumber is required", path: ["bankAccountNumber"] });
    }
  }
});

const affiliateEnrollmentBodySchema = z.object({
  fullName: z.string().min(2),
  businessName: z.string().min(2),
  channelName: z.string().min(2),
  paymentMethod: z.string().min(1),
  bankName: optionalText(2),
  bankAccountName: z.string().min(2),
  bankAccountNumber: optionalText(6)
}).superRefine((data, ctx) => {
  if (isBankTransferMethod(data.paymentMethod)) {
    if (!data.bankName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bankName is required", path: ["bankName"] });
    }
    if (!data.bankAccountNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "bankAccountNumber is required", path: ["bankAccountNumber"] });
    }
  }
});

exports.registerSchema = z.object({ body: registerBodySchema });

exports.loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
});

exports.refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10)
  })
});

exports.changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6)
  })
});

exports.forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

exports.verifyResetPasswordTokenSchema = z.object({
  query: z.object({
    token: z.string().min(20)
  })
});

exports.resetPasswordWithTokenSchema = z.object({
  body: z.object({
    token: z.string().min(20),
    newPassword: z.string().min(6)
  })
});

exports.enrollAffiliateSchema = z.object({ body: affiliateEnrollmentBodySchema });
