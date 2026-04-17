const { z } = require("zod");

exports.payOrderSchema = z.object({
  body: z.object({
    transactionCode: z.string().optional()
  })
});

exports.createVnpayPaymentSchema = z.object({
  body: z.object({
    bankCode: z.union([z.string().min(2), z.literal("")]).optional(),
    language: z.enum(["vn", "en"]).optional()
  })
});

exports.changePaymentMethodSchema = z.object({
  body: z.object({
    paymentMethod: z.enum(["COD", "VNPAY"]),
  }),
});

exports.vnpayCallbackSchema = z.object({
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
