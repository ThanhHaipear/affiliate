import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { changePassword } from "../../../api/authApi";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { changePasswordFormSchema } from "../../../schemas/customerSchemas";

function CustomerChangePasswordPage() {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordFormSchema),
  });

  async function onSubmit(values) {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Đã cập nhật mật khẩu customer.");
      reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không đổi được mật khẩu.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khách hàng"
        title="Đổi mật khẩu"
        description="Cập nhật mật khẩu tài khoản với validation rõ ràng và backend thật."
      />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-sky-200">Bảo mật</p>
          <h3 className="mt-3 text-2xl font-semibold">Mật khẩu mạnh giúp bảo vệ đơn hàng, địa chỉ và thông tin tài khoản.</h3>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
            <p>Mật khẩu mới nên dài tối thiểu 6 ký tự.</p>
            <p>Không dùng lại mật khẩu cũ trên nhiều dịch vụ.</p>
            <p>Sau khi đổi mật khẩu, bạn có thể đăng nhập lại bằng mật khẩu mới trên các thiết bị đang sử dụng.</p>
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input label="Mật khẩu hiện tại" type="password" error={errors.currentPassword?.message} {...register("currentPassword")} />
            <Input label="Mật khẩu mới" type="password" error={errors.newPassword?.message} {...register("newPassword")} />
            <Input label="Xác nhận mật khẩu mới" type="password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
            <Button type="submit" className="w-full md:w-auto" loading={isSubmitting}>
              Cập nhật mật khẩu
            </Button>
            {isSubmitSuccessful ? (
              <p className="text-sm text-emerald-700">Mật khẩu customer đã được cập nhật thành công.</p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

export default CustomerChangePasswordPage;
