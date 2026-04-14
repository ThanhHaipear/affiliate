import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { register as registerAccount } from "../../api/authApi";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import { useToast } from "../../hooks/useToast";
import { registerSellerSchema } from "../../schemas/authSchemas";

function RegisterSellerPage({ onRegisterSuccess = () => {} }) {
  const toast = useToast();
  const [submitError, setSubmitError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSellerSchema),
    defaultValues: {
      paymentMethod: "BANK_TRANSFER",
    },
  });

  const onSubmit = async (values) => {
    const payload = {
      email: values.email,
      phone: values.phone,
      password: values.password,
      role: "SELLER",
      fullName: values.fullName,
      businessName: values.businessName,
      shopName: values.shopName,
      paymentMethod: values.paymentMethod,
      bankName: values.bankName,
      bankAccountName: values.bankAccountName,
      bankAccountNumber: values.bankAccountNumber,
    };

    try {
      setSubmitError("");
      await registerAccount(payload);
      toast.success("Ho so seller da duoc gui, cho admin phe duyet.");
      onRegisterSuccess(payload);
    } catch (error) {
      const message = error.response?.data?.message || "Dang ky seller that bai. Vui long kiem tra lai thong tin.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-amber-700">Seller</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Dang ky seller</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Tao ho so shop, khai bao thanh toan va gui len admin de phe duyet truoc khi ban hang.
        </p>
      </div>
      <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-slate-700">
        Seller can duoc admin phe duyet truoc khi dang san pham va tham gia chuong trinh affiliate.
      </div>
      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Thong tin dai dien</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Ho ten" error={errors.fullName?.message} {...register("fullName")} />
            <Input label="So dien thoai" error={errors.phone?.message} {...register("phone")} />
            <Input label="Email" error={errors.email?.message} {...register("email")} />
            <Input label="Ten business" error={errors.businessName?.message} {...register("businessName")} />
            <div className="sm:col-span-2">
              <Input label="Ten shop" error={errors.shopName?.message} {...register("shopName")} />
            </div>
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Thong tin thanh toan</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Phuong thuc thanh toan"
              error={errors.paymentMethod?.message}
              options={[{ label: "Chuyen khoan ngan hang", value: "BANK_TRANSFER" }]}
              {...register("paymentMethod")}
            />
            <Input label="Ngan hang" error={errors.bankName?.message} {...register("bankName")} />
            <Input label="Ten chu tai khoan" error={errors.bankAccountName?.message} {...register("bankAccountName")} />
            <Input label="So tai khoan" error={errors.bankAccountNumber?.message} {...register("bankAccountNumber")} />
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">Bao mat tai khoan</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Mat khau" type="password" error={errors.password?.message} {...register("password")} />
            <Input label="Xac nhan mat khau" type="password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
          </div>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Gui dang ky seller
        </Button>
      </form>
      {isSubmitSuccessful && !submitError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Ho so seller da duoc gui. He thong da luu san thong tin shop va tai khoan thanh toan de admin phe duyet.
        </div>
      ) : null}
    </div>
  );
}

export default RegisterSellerPage;
