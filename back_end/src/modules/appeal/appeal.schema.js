const { z } = require("zod");

exports.createAppealSchema = z.object({
  body: z.object({
    targetType: z.enum(["PRODUCT", "AFFILIATE_LINK"]),
    targetId: z.coerce.number().int().positive(),
    content: z.string().trim().min(5, "Nội dung kiến nghị tối thiểu 5 ký tự").max(2000),
  }),
});

exports.sendMessageSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, "Nội dung không được trống").max(2000),
  }),
  params: z.object({
    appealId: z.coerce.number().int().positive(),
  }),
});

exports.adminReplySchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, "Nội dung phản hồi không được trống").max(2000),
    action: z.enum(["TEXT", "UNLOCK", "RESOLVE"]).optional().default("TEXT"),
  }),
  params: z.object({
    appealId: z.coerce.number().int().positive(),
  }),
});

exports.appealParamsSchema = z.object({
  params: z.object({
    appealId: z.coerce.number().int().positive(),
  }),
});
