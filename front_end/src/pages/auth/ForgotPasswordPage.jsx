import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { forgotPassword } from "../../api/authApi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import { useToast } from "../../hooks/useToast";
import { forgotPasswordSchema } from "../../schemas/authSchemas";

function ForgotPasswordPage() {
  const toast = useToast();
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      setSubmitError("");
      await forgotPassword({ email: values.email, newPassword: values.newPassword });
      toast.success("Da cap nhat mat khau moi. Ban co the dang nhap lai ngay.");
    } catch (error) {
      const message = error.response?.data?.message || "Khong dat lai duoc mat khau.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-sky-700">Recovery</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Quen mat khau</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Dat mat khau moi theo email da dang ky. Sau khi cap nhat xong, ban dang nhap lai bang mat khau moi ngay tren cung tai khoan.
        </p>
      </div>
      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <Input label="Email" error={errors.email?.message} {...register("email")} />
        <Input label="Mat khau moi" type="password" error={errors.newPassword?.message} {...register("newPassword")} />
        <Input
          label="Xac nhan mat khau moi"
          type="password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Dat lai mat khau
        </Button>
      </form>
      {isSubmitSuccessful && !submitError ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          Mat khau moi da duoc luu. Ban hay quay lai man dang nhap va dang nhap bang mat khau vua dat.
        </div>
      ) : null}
    </div>
  );
}

export default ForgotPasswordPage;
