import { z } from "zod";

const vietnamesePhone = /^(0|\+84)[0-9]{9,10}$/;

const customerAddressSchema = z.object({
  recipientName: z.string().min(2, "Ten nguoi nhan toi thieu 2 ky tu."),
  phone: z.string().regex(vietnamesePhone, "So dien thoai khong hop le."),
  province: z.string().min(1, "Vui long nhap tinh thanh."),
  district: z.string().min(1, "Vui long nhap quan huyen."),
  ward: z.string().min(1, "Vui long nhap phuong xa."),
  detail: z.string().min(5, "Dia chi cu the khong duoc de trong."),
  isDefault: z.boolean().optional(),
});

const customerProfileFormSchema = z.object({
  fullName: z.string().min(2, "Ho ten toi thieu 2 ky tu."),
  email: z.string().email("Email khong hop le."),
  phone: z.string().regex(vietnamesePhone, "So dien thoai khong hop le."),
});

const checkoutFormSchema = z.object({
  buyerName: z.string().min(2, "Ho ten nguoi nhan toi thieu 2 ky tu."),
  buyerEmail: z.string().email("Email khong hop le."),
  buyerPhone: z.string().regex(vietnamesePhone, "So dien thoai khong hop le."),
  shippingMethod: z.string().min(1, "Vui long chon phuong thuc giao hang."),
  paymentMethod: z.string().min(1, "Vui long chon phuong thuc thanh toan."),
  province: z.string().min(1, "Vui long nhap tinh thanh."),
  district: z.string().min(1, "Vui long nhap quan huyen."),
  ward: z.string().min(1, "Vui long nhap phuong xa."),
  detail: z.string().min(5, "Dia chi giao hang khong duoc de trong."),
});

const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(6, "Mat khau hien tai toi thieu 6 ky tu."),
    newPassword: z.string().min(6, "Mat khau moi toi thieu 6 ky tu."),
    confirmPassword: z.string().min(6, "Vui long xac nhan mat khau moi."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Xac nhan mat khau khong khop.",
    path: ["confirmPassword"],
  });

export {
  changePasswordFormSchema,
  checkoutFormSchema,
  customerAddressSchema,
  customerProfileFormSchema,
};
