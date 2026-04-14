import { z } from "zod";

const paymentAccountSchema = z.object({
  bankName: z.string().min(2, "Tên ngân hàng là bắt buộc."),
  bankAccountName: z.string().min(2, "Tên chủ tài khoản là bắt buộc."),
  bankAccountNumber: z.string().min(6, "Số tài khoản không hợp lệ."),
});

const sellerProfileSchema = z.object({
  shopName: z.string().min(2, "Tên shop là bắt buộc."),
  contactEmail: z.string().email("Email không hợp lệ."),
  phone: z.string().min(10, "Số điện thoại không hợp lệ."),
  kycStatus: z.string().min(1, "KYC status là bắt buộc."),
  paymentAccount: paymentAccountSchema,
});

const affiliateProfileSchema = z.object({
  channelName: z.string().min(2, "Tên kênh là bắt buộc."),
  niche: z.string().min(2, "Niche là bắt buộc."),
  contactEmail: z.string().email("Email không hợp lệ."),
  paymentAccount: paymentAccountSchema,
});

const customerProfileSchema = z.object({
  fullName: z.string().min(2, "Họ tên là bắt buộc."),
  phone: z.string().min(10, "Số điện thoại không hợp lệ."),
});

export {
  affiliateProfileSchema,
  customerProfileSchema,
  paymentAccountSchema,
  sellerProfileSchema,
};
