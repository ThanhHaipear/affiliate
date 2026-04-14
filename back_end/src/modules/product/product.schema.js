const { z } = require("zod");

exports.createProductSchema = z.object({
  body: z.object({
    categoryId: z.coerce.number().int().optional(),
    name: z.string().min(2),
    slug: z.string().min(2),
    description: z.string().optional(),
    basePrice: z.coerce.number().int().nonnegative(),
    images: z.array(z.object({ url: z.string().url(), sortOrder: z.number().int().optional() })).default([]),
    variants: z.array(z.object({
      sku: z.string().optional(),
      variantName: z.string().optional(),
      options: z.any().optional(),
      price: z.coerce.number().int().nonnegative(),
      quantity: z.coerce.number().int().nonnegative()
    })).min(1)
  })
});
