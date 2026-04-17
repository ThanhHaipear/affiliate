const { z } = require("zod");

exports.reviewSchema = z.object({
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectReason: z.string().optional(),
  }),
});

exports.lockAccountSchema = z.object({
  body: z.object({
    reason: z.string().trim().max(500).optional(),
    target: z.enum(["ALL", "CUSTOMER", "AFFILIATE"]).optional(),
  }),
  params: z.object({
    accountId: z.coerce.number().int().positive(),
  }),
});

exports.accountActionParamsSchema = z.object({
  body: z.object({
    target: z.enum(["ALL", "CUSTOMER", "AFFILIATE"]).optional(),
  }).optional(),
  params: z.object({
    accountId: z.coerce.number().int().positive(),
  }),
});

exports.accountListQuerySchema = z.object({
  query: z.object({
    q: z.string().trim().optional(),
    role: z.string().trim().optional(),
    status: z.string().trim().optional(),
  }),
});

exports.adminOrdersQuerySchema = z.object({
  query: z.object({
    status: z.string().trim().optional(),
    sellerConfirmed: z.enum(["true", "false"]).optional(),
  }),
});

exports.fraudAlertsQuerySchema = z.object({
  query: z.object({
    status: z.string().trim().optional(),
    severity: z.string().trim().optional(),
  }),
});

exports.platformFeeSchema = z.object({
  body: z.object({
    feeValue: z.coerce.number().min(0).max(100),
  }),
});

exports.withdrawalConfigSchema = z.object({
  body: z.object({
    minAmount: z.coerce.number().int().positive(),
    maxAmount: z.coerce.number().int().positive(),
  }).refine((data) => data.maxAmount >= data.minAmount, {
    message: "maxAmount must be greater than or equal to minAmount",
    path: ["maxAmount"],
  }),
});

exports.refundReviewSchema = z.object({
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectReason: z.string().trim().max(500).optional(),
  }),
  params: z.object({
    refundId: z.coerce.number().int().positive(),
  }),
});
