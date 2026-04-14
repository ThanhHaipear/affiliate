const { z } = require("zod");

const emptyToUndefined = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const optionalTrimmedString = () => z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = () => z.preprocess(emptyToUndefined, z.string().url().optional());
const normalizePaymentType = (value = "") => String(value || "").trim().toUpperCase();

exports.profileSchema = z.object({
  body: z
    .object({
      fullName: z.string().min(2),
      avatarUrl: optionalUrl(),
      phone: z.preprocess(emptyToUndefined, z.string().min(8).max(20).optional()),
      channelPlatform: optionalTrimmedString(),
      channelUrl: optionalUrl(),
      channelDescription: optionalTrimmedString(),
      paymentType: optionalTrimmedString(),
      paymentAccountName: optionalTrimmedString(),
      paymentAccountNumber: optionalTrimmedString(),
      paymentBankName: optionalTrimmedString(),
      paymentBranch: optionalTrimmedString(),
    })
    .superRefine((value, ctx) => {
      const hasChannelInput = Boolean(value.channelPlatform || value.channelUrl || value.channelDescription);
      if (hasChannelInput) {
        if (!value.channelPlatform) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["channelPlatform"],
            message: "Channel platform is required",
          });
        }

        if (!value.channelUrl) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["channelUrl"],
            message: "Channel URL is required",
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
            message: "Payment type is required",
          });
        }

        if (!value.paymentAccountName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["paymentAccountName"],
            message: "Payment account name is required",
          });
        }

        if (!value.paymentAccountNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["paymentAccountNumber"],
            message: "Payment account number is required",
          });
        }

        if (normalizePaymentType(value.paymentType) === "BANK_TRANSFER" && !value.paymentBankName) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["paymentBankName"],
            message: "Bank name is required for bank transfer",
          });
        }
      }
    }),
});

exports.kycSchema = z.object({
  body: z.object({
    documentType: z.string().min(2),
    documentNumber: z.string().min(3),
    fullNameOnDocument: z.string().optional(),
    permanentAddress: z.string().optional(),
    nationality: z.string().optional(),
    documentUrls: z.array(z.string().url()).min(1),
  }),
});

exports.channelSchema = z.object({
  body: z.object({
    platform: z.string().min(2),
    url: z.string().url(),
    description: z.string().optional(),
  }),
});

exports.paymentSchema = z.object({
  body: z.object({
    type: z.string().min(2),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    bankName: z.string().optional(),
    branch: z.string().optional(),
    makeDefault: z.boolean().optional(),
  }),
});
