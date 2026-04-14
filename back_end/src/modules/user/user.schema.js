const { z } = require("zod");

exports.profileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(10),
  }),
});
