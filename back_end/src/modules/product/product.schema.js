const { z } = require("zod");

const productBodyBaseSchema = {
  categoryId: z.coerce.number().int().optional(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  basePrice: z.coerce.number().int().nonnegative(),
  images: z.array(
    z.object({
      url: z.string().url(),
      sortOrder: z.number().int().optional(),
    }),
  ).default([]),
};

const productVariantCreateSchema = z.object({
  sku: z.string().optional(),
  variantName: z.string().optional(),
  options: z.any().optional(),
  price: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().positive(),
});

const productVariantUpdateSchema = z.object({
  sku: z.string().optional(),
  variantName: z.string().optional(),
  options: z.any().optional(),
  price: z.coerce.number().int().nonnegative(),
  quantity: z.coerce.number().int().nonnegative(),
});

exports.createProductSchema = z.object({
  body: z.object({
    ...productBodyBaseSchema,
    variants: z.array(productVariantCreateSchema).min(1),
  }),
});

exports.updateProductSchema = z.object({
  body: z.object({
    ...productBodyBaseSchema,
    variants: z.array(productVariantUpdateSchema).min(1),
  }),
});

exports.createReviewSchema = z.object({
  body: z.object({
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional().default(""),
  }),
  params: z.object({
    productId: z.coerce.number().int().positive(),
  }),
});
