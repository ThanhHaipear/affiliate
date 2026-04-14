const { z } = require("zod");

const addressBody = z.object({
  recipientName: z.string().min(2),
  phone: z.string().min(8),
  province: z.string().min(1),
  district: z.string().min(1),
  ward: z.string().min(1),
  detail: z.string().min(5),
  isDefault: z.boolean().optional().default(false),
});

const addressIdParams = z.object({
  addressId: z.coerce.bigint().positive(),
});

exports.createAddressSchema = z.object({
  body: addressBody,
  params: z.object({}),
  query: z.object({}),
});

exports.updateAddressSchema = z.object({
  body: addressBody,
  params: addressIdParams,
  query: z.object({}),
});

exports.addressIdSchema = z.object({
  body: z.object({}),
  params: addressIdParams,
  query: z.object({}),
});
