import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { register as registerAccount } from "../../api/authApi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import { useToast } from "../../hooks/useToast";
import { registerAffiliateSchema } from "../../schemas/authSchemas";

function RegisterAffiliatePage({ onRegisterSuccess = () => {} }) {
  const toast = useToast();
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerAffiliateSchema),
    defaultValues: {
      paymentMethod: "BANK_TRANSFER",
    },
  });

  const onSubmit = async (values) => {
    const payload = {
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: "AFFILIATE",
      fullName: values.fullName,
      businessName: values.businessName,
      channelName: values.channelName,
      paymentMethod: values.paymentMethod,
      bankName: values.bankName,
      bankAccountName: values.bankAccountName,
      bankAccountNumber: values.bankAccountNumber,
    };

    try {
      setSubmitError("");
      await registerAccount(payload);
      toast.success("Hồ sơ affiliate đã được gửi, chờ admin phê duyệt.");
      onRegisterSuccess(payload);
    } catch (error) {
      const message = error.response?.data?.message || "Đăng ký affiliate thất bại. Vui lòng kiểm tra lại thông tin.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-violet-700">Affiliate</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Đăng ký affiliate</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Khai báo thông tin cá nhân, kênh tiếp thị và tài khoản nhận tiền để hồ sơ được tạo đầy đủ ngay từ bước đăng ký.
        </p>
      </div>
      <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50 p-4 text-sm leading-7 text-slate-700">
        Affiliate cần được admin phê duyệt trước khi tạo link tiếp thị và nhận commission.
      </div>
      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Thông tin hồ sơ</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Họ tên" error={errors.fullName?.message} {...register("fullName")} />
            <Input label="Số điện thoại" error={errors.phone?.message} {...register("phone")} />
            <Input label="Email" error={errors.email?.message} {...register("email")} />
            <Input label="Tên doanh nghiệp" error={errors.businessName?.message} {...register("businessName")} />
            <div className="sm:col-span-2">
              <Input label="Tên kênh" error={errors.channelName?.message} {...register("channelName")} />
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Thông tin nhận tiền</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Phương thức thanh toán"
              error={errors.paymentMethod?.message}
              options={[{ label: "Chuyển khoản ngân hàng", value: "BANK_TRANSFER" }]}
              {...register("paymentMethod")}
            />
            <Input label="Ngân hàng" error={errors.bankName?.message} {...register("bankName")} />
            <Input label="Tên chủ tài khoản" error={errors.bankAccountName?.message} {...register("bankAccountName")} />
            <Input label="Số tài khoản" error={errors.bankAccountNumber?.message} {...register("bankAccountNumber")} />
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Bảo mật tài khoản</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Mật khẩu" type="password" error={errors.password?.message} {...register("password")} />
            <Input label="Xác nhận mật khẩu" type="password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
          </div>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Gửi đăng ký affiliate
        </Button>
      </form>
      {isSubmitSuccessful && !submitError ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          Hồ sơ affiliate đã được gửi. Hệ thống đã lưu sẵn thông tin kênh và tài khoản nhận tiền để chờ admin phê duyệt.
        </div>
      ) : null}
    </div>
  );
}

export default RegisterAffiliatePage;
