import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import Button from "../common/Button";
import Input from "../common/Input";
import MoneyText from "../common/MoneyText";
import { withdrawalRequestSchema } from "../../schemas/payoutSchemas";

const numberFormatter = new Intl.NumberFormat("vi-VN");

function WithdrawalForm({
  onSubmit,
  loading = false,
  availableBalance = 0,
  minAmount = 0,
  maxAmount = 0,
  maxRequestableAmount = 0,
  paymentAccount = null,
  disabledReason = "",
  title = "Yêu cầu rút tiền",
  description = "Yêu cầu rút tiền sẽ dùng tài khoản nhận tiền mặc định đang hoạt động trên tài khoản hiện tại.",
  paymentAccountLink = "/affiliate/payment-accounts",
  paymentAccountLinkLabel = "Sửa tài khoản nhận tiền",
  successMessage = "Yêu cầu rút tiền đã được tạo.",
}) {
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitSuccessful, isSubmitting },
  } = useForm({
    resolver: zodResolver(withdrawalRequestSchema),
    defaultValues: {
      amount: "",
    },
  });

  const isDisabled = loading || isSubmitting || Boolean(disabledReason);

  function handleLocalSubmit(values) {
    const amount = Number(values.amount);

    if (minAmount > 0 && amount < minAmount) {
      setError("amount", {
        type: "manual",
        message: `Số tiền rút tối thiểu là ${numberFormatter.format(minAmount)}.`,
      });
      return;
    }

    if (maxRequestableAmount > 0 && amount > maxRequestableAmount) {
      setError("amount", {
        type: "manual",
        message: `Số tiền rút tối đa hiện tại là ${numberFormatter.format(maxRequestableAmount)}.`,
      });
      return;
    }

    clearErrors("amount");
    onSubmit?.(values);
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
        </div>
        <Link
          to={paymentAccountLink}
          className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {paymentAccountLinkLabel}
        </Link>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <InfoCard label="Số dư trong ví" value={<MoneyText value={availableBalance} className="text-slate-900" />} />
        <InfoCard label="Mức rút tối thiểu" value={<MoneyText value={minAmount} className="text-slate-900" />} />
        <InfoCard label="Mức rút tối đa hiện tại" value={<MoneyText value={maxRequestableAmount || maxAmount} className="text-slate-900" />} />
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.24em] text-sky-700">Tài khoản nhận tiền</p>
        {paymentAccount?.id ? (
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <Row label="Phương thức" value={paymentAccount.type || "BANK_TRANSFER"} />
            <Row label="Ngân hàng" value={paymentAccount.bank_name || "--"} />
            <Row label="Chủ tài khoản" value={paymentAccount.account_name || "--"} />
            <Row label="Số tài khoản" value={paymentAccount.account_number || "--"} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-rose-600">Chưa có tài khoản nhận tiền đang hoạt động.</p>
        )}
      </div>

      <form className="mt-5 space-y-4" onSubmit={handleSubmit(handleLocalSubmit)}>
        <Input
          label="Số tiền muốn rút"
          type="number"
          min={minAmount || 0}
          max={maxRequestableAmount || maxAmount || undefined}
          step="1000"
          hint={`Có thể rút từ ${numberFormatter.format(minAmount || 0)} đến ${numberFormatter.format(maxRequestableAmount || maxAmount || 0)} VND.`}
          error={errors.amount?.message}
          {...register("amount")}
        />
        {disabledReason ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{disabledReason}</div>
        ) : null}
        <Button type="submit" className="w-full" loading={loading || isSubmitting} disabled={isDisabled}>
          Thực hiện yêu cầu rút tiền
        </Button>
      </form>
      {isSubmitSuccessful ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="mt-3 text-lg font-semibold">{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-2 last:border-b-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

export default WithdrawalForm;
