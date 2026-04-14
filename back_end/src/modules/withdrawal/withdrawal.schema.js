const { z } = require("zod");

exports.requestWithdrawalSchema = z.object({
  body: z.object({
    amount: z.coerce.number().int().positive(),
  }),
});

exports.reviewWithdrawalSchema = z.object({
  params: z.object({
    withdrawalId: z.coerce.number().int().positive(),
  }),
  body: z.object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectReason: z.string().trim().max(1000).optional(),
  }),
});

exports.adminListWithdrawalsSchema = z.object({
  query: z.object({
    statuses: z
      .union([z.string(), z.array(z.string())])
      .optional()
      .transform((value) => {
        if (!value) {
          return [];
        }

        const values = Array.isArray(value) ? value : [value];
        return values
          .flatMap((item) => String(item).split(","))
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean);
      })
      .refine(
        (statuses) => statuses.every((status) => ["PENDING", "APPROVED", "REJECTED", "PROCESSING", "PAID"].includes(status)),
        "Invalid withdrawal status filter",
      ),
  }),
});
