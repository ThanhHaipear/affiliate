import { z } from "zod";

const sellerShopSchema = z.object({
  shopName: z.string().min(2, "Ten shop la bat buoc."),
  contactEmail: z.string().email("Email khong hop le."),
  phone: z.string().min(10, "So dien thoai khong hop le."),
  address: z.string().min(5, "Dia chi la bat buoc."),
  businessField: z.string().min(2, "Linh vuc kinh doanh la bat buoc."),
  shopDescription: z.string().min(10, "Mo ta shop toi thieu 10 ky tu."),
  taxCode: z.string().min(4, "Thong tin phap ly chua hop le."),
});

const sellerChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, "Mat khau hien tai toi thieu 6 ky tu."),
    newPassword: z.string().min(6, "Mat khau moi toi thieu 6 ky tu."),
    confirmPassword: z.string().min(6, "Ban can xac nhan lai mat khau moi."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Mat khau xac nhan phai khop.",
    path: ["confirmPassword"],
  });

export { sellerChangePasswordSchema, sellerShopSchema };
