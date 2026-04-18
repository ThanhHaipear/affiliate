import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { forgotPassword } from "../../api/authApi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useToast } from "../../hooks/useToast";
import { forgotPasswordSchema } from "../../schemas/authSchemas";

function ForgotPasswordPage() {
  const toast = useToast();
  const [submitError, setSubmitError] = useState("");
  const [searchParams] = useSearchParams();
  const prefilledEmail = searchParams.get("email") || "";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: prefilledEmail,
    },
  });

  useEffect(() => {
    reset({ email: prefilledEmail });
  }, [prefilledEmail, reset]);

  const onSubmit = async (values) => {
    try {
      setSubmitError("");
      await forgotPassword({ email: values.email });
      toast.success("Nếu email tồn tại, hệ thống đã gửi liên kết đặt lại mật khẩu.");
    } catch (error) {
      const message = error.response?.data?.message || "Không gửi được email đặt lại mật khẩu.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Khôi phục</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Quên mật khẩu</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Nhập email đã đăng ký. Hệ thống sẽ gửi một liên kết đặt lại mật khẩu có thời hạn đến email của tài khoản.
        </p>
      </div>
      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Gửi liên kết đặt lại mật khẩu
        </Button>
      </form>
      {isSubmitSuccessful && !submitError ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-sky-900">
          Nếu email tồn tại trong hệ thống, bạn sẽ nhận được một email chứa liên kết đặt lại mật khẩu trong ít phút.
        </div>
      ) : null}
      <div className="text-sm text-slate-600">
        Nhớ lại mật khẩu?
        {" "}
        <Link to="/auth/login" className="font-medium text-sky-700 hover:text-sky-900">
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
