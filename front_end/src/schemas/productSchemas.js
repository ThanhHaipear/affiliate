import { z } from "zod";

const productSchema = z.object({
  name: z.string().min(2, "Tên sản phẩm là bắt buộc."),
  description: z.string().min(10, "Mô tả tối thiểu 10 ký tự."),
  price: z.coerce.number().positive("Giá phải lớn hơn 0."),
  category: z.string().min(1, "Danh mục là bắt buộc."),
  stock: z.coerce.number().int().nonnegative("Tồn kho không hợp lệ."),
  commission_type: z.enum(["PERCENT", "FIXED"]),
  commission_value: z.coerce.number().positive("Commission phải lớn hơn 0."),
});

const affiliateSettingSchema = z.object({
  product_id: z.string().min(1, "Product là bắt buộc."),
  commission_type: z.enum(["PERCENT", "FIXED"]),
  commission_value: z.coerce.number().positive("Commission phải lớn hơn 0."),
});

export { affiliateSettingSchema, productSchema };
