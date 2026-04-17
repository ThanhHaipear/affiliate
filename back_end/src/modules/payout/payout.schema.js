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

exports.createBatchVnpayPaymentSchema = z.object({
  body: z.object({
    bankCode: z.union([z.string().min(2), z.literal("")]).optional(),
    language: z.enum(["vn", "en"]).optional()
  })
});

exports.vnpayBatchCallbackSchema = z.object({
  body: z.object({
    vnp_Amount: z.union([z.string(), z.number()]),
    vnp_BankCode: z.string().optional(),
    vnp_BankTranNo: z.string().optional(),
    vnp_CardType: z.string().optional(),
    vnp_OrderInfo: z.string(),
    vnp_PayDate: z.string().optional(),
    vnp_ResponseCode: z.string(),
    vnp_SecureHash: z.string(),
    vnp_TmnCode: z.string(),
    vnp_TransactionNo: z.union([z.string(), z.number()]).optional(),
    vnp_TransactionStatus: z.string(),
    vnp_TxnRef: z.union([z.string(), z.number()])
  }).passthrough()
});

exports.processBatchSchema = z.object({
  body: z.object({
    transactionCodePrefix: z.string().optional()
  })
});
