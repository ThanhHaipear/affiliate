import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { changePassword } from "../../../api/authApi";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { sellerChangePasswordSchema } from "../../../schemas/sellerPortalSchemas";

function SellerChangePasswordPage() {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm({
    resolver: zodResolver(sellerChangePasswordSchema),
  });

  async function onSubmit(values) {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast.success("\u0110\u00e3 c\u1eadp nh\u1eadt m\u1eadt kh\u1ea9u.");
      reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Kh\u00f4ng \u0111\u1ed5i \u0111\u01b0\u1ee3c m\u1eadt kh\u1ea9u.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title={"\u0110\u1ed5i m\u1eadt kh\u1ea9u"}
        description={"Form \u0111\u1ed5i m\u1eadt kh\u1ea9u ri\u00eang cho seller portal, c\u00f3 validation r\u00f5 r\u00e0ng v\u00e0 c\u00f3 th\u1ec3 n\u1ed1i tr\u1ef1c ti\u1ebfp v\u1edbi backend."}
      />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-sky-900/20 bg-[linear-gradient(180deg,#0f172a_0%,#12263f_100%)] p-6 text-white shadow-sm">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Security</p>
          <h3 className="mt-3 text-2xl font-semibold">{"B\u1ea3o v\u1ec7 shop, \u0111\u01a1n h\u00e0ng v\u00e0 doanh thu b\u1eb1ng m\u1ed9t m\u1eadt kh\u1ea9u m\u1ea1nh."}</h3>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-300">
            <p>{"Kh\u00f4ng chia s\u1ebb m\u1eadt kh\u1ea9u seller cho nh\u00e2n s\u1ef1 v\u1eadn h\u00e0nh kh\u00f4ng \u0111\u01b0\u1ee3c ph\u00e2n quy\u1ec1n."}</p>
            <p>{"\u0110\u1ed5i m\u1eadt kh\u1ea9u ngay n\u1ebfu nghi ng\u1edd t\u00e0i kho\u1ea3n \u0111\u00e3 b\u1ecb truy c\u1eadp tr\u00e1i ph\u00e9p."}</p>
            <p>{"Seller portal n\u00ean c\u00f3 quy tr\u00ecnh \u0111\u1ed5i m\u1eadt kh\u1ea9u ri\u00eang v\u00ec li\u00ean quan t\u1edbi payout v\u00e0 doanh thu."}</p>
          </div>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <Input label={"M\u1eadt kh\u1ea9u hi\u1ec7n t\u1ea1i"} type="password" error={errors.currentPassword?.message} {...register("currentPassword")} />
            <Input label={"M\u1eadt kh\u1ea9u m\u1edbi"} type="password" error={errors.newPassword?.message} {...register("newPassword")} />
            <Input label={"X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u m\u1edbi"} type="password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
            <Button type="submit" className="w-full md:w-auto" loading={isSubmitting}>
              {"C\u1eadp nh\u1eadt m\u1eadt kh\u1ea9u"}
            </Button>
            {isSubmitSuccessful ? <p className="text-sm text-emerald-700">{"M\u1eadt kh\u1ea9u \u0111\u00e3 \u0111\u01b0\u1ee3c c\u1eadp nh\u1eadt th\u00e0nh c\u00f4ng."}</p> : null}
          </form>
        </div>
      </div>
    </div>
  );
}

export default SellerChangePasswordPage;