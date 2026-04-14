const { z } = require("zod");

exports.createBatchSchema = z.object({
  body: z.object({
    payoutDate: z.string(),
    type: z.string().min(2),
    withdrawalIds: z.array(z.coerce.number().int().positive()).min(1),
    bankName: z.string().optional(),
    branch: z.string().optional(),
    note: z.string().optional()
  })
});

exports.processBatchSchema = z.object({
  body: z.object({
    transactionCodePrefix: z.string().optional()
  })
});
