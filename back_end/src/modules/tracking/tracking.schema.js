const { z } = require("zod");

exports.createLinkSchema = z.object({
  body: z.object({
    productId: z.coerce.number().int().positive(),
  }),
});

exports.revokeLinkSchema = z.object({
  params: z.object({
    linkId: z.coerce.number().int().positive(),
  }),
});

exports.linkStatusSchema = z.object({
  params: z.object({
    shortCode: z.string().min(4),
  }),
});

exports.trackClickSchema = z.object({
  body: z.object({
    shortCode: z.string().min(4),
    viewerId: z.coerce.number().int().optional(),
    referrer: z.string().optional(),
    deviceId: z.string().optional(),
  }),
});
