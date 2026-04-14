const { z } = require("zod");

exports.payOrderSchema = z.object({
  body: z.object({
    transactionCode: z.string().optional()
  })
});

exports.confirmReceiptSchema = z.object({
  body: z.object({
    note: z.string().optional()
  })
});

exports.refundOrderSchema = z.object({
  body: z.object({
    reason: z.string().min(3)
  })
});

exports.cancelOrderSchema = z.object({
  body: z.object({
    reason: z.string().min(3).optional()
  })
});
