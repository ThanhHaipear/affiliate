import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { changePassword } from "../../../api/authApi";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { affiliateChangePasswordSchema } from "../../../schemas/affiliatePortalSchemas";

function AffiliateChangePasswordPage() {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm({
    resolver: zodResolver(affiliateChangePasswordSchema),
  });

  async function onSubmit(values) {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("Đã cập nhật mật khẩu affiliate.");
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
        eyebrow="Affiliate"
        title="Đổi mật khẩu"
        description="Bảo vệ tài khoản affiliate, dashboard hiệu suất và payout bằng một mật khẩu riêng, rõ ràng và dễ quản lý."
      />
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[2rem] border border-slate-900 bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Security</p>
          <h3 className="mt-3 text-2xl font-semibold">Tài khoản affiliate liên quan trực tiếp đến commission và withdrawal.</h3>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
            <p>Không dùng chung mật khẩu này với email, kênh social hoặc công cụ tracking bên ngoài.</p>
            <p>Đổi mật khẩu ngay nếu nghi ngờ có người khác truy cập dashboard hoặc thông tin thanh toán.</p>
            <p>Nếu vừa đổi mật khẩu, hãy đăng nhập lại trên các trình duyệt và thiết bị đang dùng.</p>
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
            {isSubmitSuccessful ? <p className="text-sm text-emerald-700">Mật khẩu affiliate đã được cập nhật thành công.</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}

export default AffiliateChangePasswordPage;
