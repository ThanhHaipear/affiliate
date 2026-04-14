import { z } from "zod";

const withdrawalRequestSchema = z.object({
  amount: z.coerce.number().positive("Số tiền phải lớn hơn 0."),
});

export { withdrawalRequestSchema };
