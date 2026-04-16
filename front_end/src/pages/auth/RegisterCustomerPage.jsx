import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { register as registerAccount } from "../../api/authApi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useToast } from "../../hooks/useToast";
import { registerCustomerSchema } from "../../schemas/authSchemas";

function RegisterCustomerPage({ onRegisterSuccess = () => {} }) {
  const toast = useToast();
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerCustomerSchema),
  });

  const onSubmit = async (values) => {
    const payload = {
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: "CUSTOMER",
      fullName: values.fullName,
    };

    try {
      setSubmitError("");
      await registerAccount(payload);
      toast.success("Tài khoản customer đã được tạo thành công.");
      onRegisterSuccess(payload);
    } catch (error) {
      const message = error.response?.data?.message || "Đăng ký customer thất bại. Vui lòng kiểm tra lại thông tin.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Customer</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Đăng ký customer</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Tạo tài khoản mua hàng để quản lý giỏ hàng, thanh toán và theo dõi lịch sử đơn.
        </p>
      </div>
      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Thông tin cơ bản</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Họ tên" error={errors.fullName?.message} {...register("fullName")} />
            <Input label="Số điện thoại" error={errors.phone?.message} {...register("phone")} />
            <div className="sm:col-span-2">
              <Input label="Email" error={errors.email?.message} {...register("email")} />
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Bảo mật tài khoản</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Mật khẩu" type="password" error={errors.password?.message} {...register("password")} />
            <Input
              label="Xác nhận mật khẩu"
              type="password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
          </div>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Tạo tài khoản
        </Button>
      </form>
      {isSubmitSuccessful && !submitError ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Đăng ký thành công. Bạn có thể đăng nhập ngay.
        </div>
      ) : null}
      <Link to="/auth/login" className="text-sm font-medium text-sky-700 hover:text-sky-900">
        Quay lại đăng nhập
      </Link>
    </div>
  );
}

export default RegisterCustomerPage;
