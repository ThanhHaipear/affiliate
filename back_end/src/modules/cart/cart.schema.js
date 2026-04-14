const { z } = require("zod");

exports.addItemSchema = z.object({
  body: z.object({
    productId: z.coerce.number().int().positive(),
    variantId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    attributionToken: z.string().optional()
  })
});

exports.updateItemQuantitySchema = z.object({
  body: z.object({
    quantity: z.coerce.number().int().positive(),
  })
});

exports.checkoutSchema = z.object({
  body: z.object({
    addressId: z.coerce.number().int().positive(),
    selectedItemIds: z.array(z.coerce.number().int().positive()).min(1).optional(),
    shippingFee: z.coerce.number().int().nonnegative().default(0),
    discountAmount: z.coerce.number().int().nonnegative().default(0),
    buyerName: z.string().optional(),
    buyerEmail: z.string().email().optional(),
    buyerPhone: z.string().optional(),
    shippingMethod: z.string().min(2),
    paymentMethod: z.string().min(2)
  })
});
