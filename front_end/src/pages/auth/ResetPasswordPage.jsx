import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword, verifyResetPasswordToken } from "../../api/authApi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useToast } from "../../hooks/useToast";
import { resetPasswordSchema } from "../../schemas/authSchemas";

function ResetPasswordPage() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);
  const [status, setStatus] = useState("checking");
  const [tokenInfo, setTokenInfo] = useState(null);
  const [tokenError, setTokenError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let active = true;

    async function checkToken() {
      if (!token) {
        setStatus("invalid");
        setTokenError("Liên kết đặt lại mật khẩu không hợp lệ.");
        return;
      }

      try {
        setStatus("checking");
        setTokenError("");
        const response = await verifyResetPasswordToken(token);
        if (!active) {
          return;
        }
        setTokenInfo(response);
        setStatus("ready");
      } catch (error) {
        if (!active) {
          return;
        }
        setStatus("invalid");
        setTokenError(error.response?.data?.message || "Liên kết đặt lại mật khẩu đã hết hạn hoặc không hợp lệ.");
      }
    }

    checkToken();

    return () => {
      active = false;
    };
  }, [token]);

  const onSubmit = async (values) => {
    try {
      setSubmitError("");
      await resetPassword({
        token,
        newPassword: values.newPassword,
      });
      setStatus("done");
      toast.success("Mật khẩu mới đã được cập nhật.");
    } catch (error) {
      const message = error.response?.data?.message || "Không đặt lại được mật khẩu.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Khôi phục</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Đặt lại mật khẩu</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Liên kết này chỉ dùng được một lần và có thời hạn. Sau khi đặt mật khẩu mới, bạn đăng nhập lại như bình thường.
        </p>
      </div>

      {status === "checking" ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Đang kiểm tra liên kết đặt lại mật khẩu...
        </div>
      ) : null}

      {status === "invalid" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {tokenError}
          </div>
          <Link to="/auth/forgot-password">
            <Button>Gửi lại email đặt lại mật khẩu</Button>
          </Link>
        </div>
      ) : null}

      {status === "ready" ? (
        <>
          {tokenInfo?.email ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
              Đặt mật khẩu mới cho tài khoản: <strong>{tokenInfo.email}</strong>
            </div>
          ) : null}
          {submitError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {submitError}
            </div>
          ) : null}
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Mật khẩu mới"
              type="password"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register("newPassword")}
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <Button type="submit" className="w-full" loading={isSubmitting}>
              Cập nhật mật khẩu
            </Button>
          </form>
        </>
      ) : null}

      {status === "done" && isSubmitSuccessful ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Mật khẩu đã được cập nhật thành công. Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.
          </div>
          <Link to="/auth/login">
            <Button>Đi đến trang đăng nhập</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export default ResetPasswordPage;
