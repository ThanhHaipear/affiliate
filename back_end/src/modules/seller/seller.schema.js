const { z } = require("zod");

exports.upsertProfileSchema = z.object({
  body: z.object({
    shopName: z.string().min(2),
    email: z.string().email().optional(),
    phone: z.string().min(8).optional(),
    address: z.string().optional(),
    taxCode: z.string().optional(),
    shopDescription: z.string().optional(),
    businessField: z.string().optional()
  })
});

exports.kycSchema = z.object({
  body: z.object({
    documentType: z.string().min(2),
    documentNumber: z.string().min(3),
    fullNameOnDocument: z.string().optional(),
    permanentAddress: z.string().optional(),
    issuedPlace: z.string().optional(),
    documentUrls: z.array(z.string().url()).min(1)
  })
});

exports.paymentSchema = z.object({
  body: z.object({
    type: z.string().min(2),
    accountName: z.string().optional(),
    accountNumber: z.string().optional(),
    bankName: z.string().optional(),
    branch: z.string().optional(),
    makeDefault: z.boolean().optional()
  })
});

exports.affiliateSettingSchema = z.object({
  body: z.object({
    commissionType: z.literal("PERCENT"),
    commissionValue: z.coerce.number().int().min(0).max(100),
    isEnabled: z.boolean().optional()
  })
});

exports.productVisibilitySchema = z.object({
  body: z.object({
    visible: z.boolean(),
  }),
  params: z.object({
    productId: z.coerce.number().int().positive(),
  }),
});
