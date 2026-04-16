import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { enrollAffiliate } from "../../../api/authApi";
import { getCurrentUserProfile } from "../../../api/userApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { affiliateEnrollmentSchema } from "../../../schemas/authSchemas";
import { useAuthStore } from "../../../store/authStore";

const PAYMENT_METHOD_OPTIONS = ["BANK_TRANSFER", "MoMo", "VNPay"];

const BANK_OPTIONS = [
  "Vietcombank",
  "BIDV",
  "VietinBank",
  "Agribank",
  "Techcombank",
  "MB Bank",
  "ACB",
  "VPBank",
  "Sacombank",
  "TPBank",
];

const normalizePaymentMethod = (value = "") => String(value).trim().toUpperCase();

function CustomerAffiliatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const loginStore = useAuthStore((state) => state.login);
  const setUser = useAuthStore((state) => state.setUser);
  const roles = useAuthStore((state) => state.roles);
  const currentUser = useAuthStore((state) => state.currentUser);
  const [submitError, setSubmitError] = useState("");
  const [checkingStatus, setCheckingStatus] = useState(true);

  const isAffiliate = roles.includes("affiliate");
  const affiliateStatus = currentUser?.profile?.affiliateStatus || null;
  const hasAffiliateApplication = Boolean(currentUser?.profile?.hasAffiliateApplication || affiliateStatus);
  const isPendingApplication = affiliateStatus === "PENDING" || (hasAffiliateApplication && !affiliateStatus);
  const defaultAffiliateName = currentUser?.profile?.fullName || currentUser?.email || "Affiliate";

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(affiliateEnrollmentSchema),
    defaultValues: {
      fullName: currentUser?.profile?.fullName || "",
      businessName: `${defaultAffiliateName} Affiliate`,
      channelName: `${defaultAffiliateName} Channel`,
      paymentMethod: "BANK_TRANSFER",
      bankName: "",
      bankAccountName: "",
      bankAccountNumber: "",
    },
  });

  const paymentMethod = watch("paymentMethod");
  const isBankTransfer = normalizePaymentMethod(paymentMethod) === "BANK_TRANSFER";

  const bankNameLabel = isBankTransfer ? "Tên ngân hàng" : "Tên ngân hàng / Nhà cung cấp";
  const bankNamePlaceholder = isBankTransfer ? "Nhập hoặc chọn ngân hàng" : "Có thể để trống hoặc nhập nhà cung cấp";
  const bankNameHint = isBankTransfer ? "Bắt buộc khi chọn chuyển khoản ngân hàng." : "Không bắt buộc với MoMo hoặc VNPay.";
  const accountNumberLabel = isBankTransfer ? "Số tài khoản" : "Số ví / Mã thanh toán";
  const accountNumberPlaceholder = isBankTransfer ? "Nhập số tài khoản ngân hàng" : "Có thể để trống hoặc nhập số ví / mã thanh toán";
  const accountNumberHint = isBankTransfer ? "Bắt buộc khi chọn chuyển khoản ngân hàng." : "Không bắt buộc với MoMo hoặc VNPay.";

  useEffect(() => {
    let active = true;

    async function syncCurrentProfile() {
      try {
        const profile = await getCurrentUserProfile();

        if (!active || !profile) {
          return;
        }

        const baseUser = useAuthStore.getState().currentUser || {};
        setUser({
          ...baseUser,
          ...profile,
          roles: profile?.roles?.length ? profile.roles : baseUser.roles || [],
          profile: {
            ...(baseUser.profile || {}),
            ...(profile.profile || {}),
          },
        });
      } finally {
        if (active) {
          setCheckingStatus(false);
        }
      }
    }

    syncCurrentProfile();

    return () => {
      active = false;
    };
  }, [setUser]);

  const onSubmit = async (values) => {
    try {
      setSubmitError("");
      const session = await enrollAffiliate(values);
      loginStore(session);
      toast.success("Đã gửi đăng ký affiliate. Vui lòng chờ admin phê duyệt.");
      navigate("/dashboard/customer/affiliate", { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || "Không đăng ký được vai trò affiliate trên tài khoản hiện tại.";
      setSubmitError(message);
      toast.error(message);
    }
  };

  if (checkingStatus) {
    return <EmptyState title="Đang kiểm tra trạng thái affiliate" description="Hệ thống đang đồng bộ hồ sơ hiện tại trước khi hiển thị biểu mẫu." />;
  }

  if (isAffiliate) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Customer + Affiliate"
          title="Tài khoản affiliate đã sẵn sàng"
          description="Tài khoản hiện tại đã có đồng thời vai trò customer và affiliate. Bạn có thể vào khu affiliate riêng để tạo link, xem hoa hồng và rút tiền."
        />
        <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-sm leading-7 text-slate-700">
          Không cần tạo tài khoản mới. Customer và affiliate đang dùng chung email, chung mật khẩu và chung thông tin đăng nhập.
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/affiliate">
            <Button>Mở khu affiliate</Button>
          </Link>
          <Link to="/dashboard/customer/profile">
            <Button variant="secondary">Quay lại customer</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isPendingApplication) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Customer + Affiliate"
          title="Hồ sơ affiliate đang chờ duyệt"
          description="Bạn đã gửi đăng ký affiliate. Sau khi admin duyệt thành công, hệ thống mới mở khu affiliate cho tài khoản này."
        />
        <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-sm leading-7 text-amber-900">
          Hồ sơ hiện đang ở trạng thái chờ duyệt. Bạn chưa thể vào trang affiliate cho tới khi admin phê duyệt.
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/dashboard/customer/profile">
            <Button variant="secondary">Quay lại customer</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (affiliateStatus === "REJECTED") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Customer + Affiliate"
          title="Hồ sơ affiliate chưa được phê duyệt"
          description="Tài khoản này đã từng gửi đăng ký affiliate nhưng chưa được phê duyệt thành công."
        />
        <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm leading-7 text-rose-700">
          Trạng thái hiện tại: {affiliateStatus}. Vui lòng cập nhật thông tin nếu cần và gửi lại hồ sơ.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Customer + Affiliate"
        title="Đăng ký affiliate trên cùng tài khoản"
        description="Không cần tạo account mới. Sau khi gửi thông tin, hồ sơ sẽ vào hàng đợi duyệt và chỉ được mở khu affiliate sau khi admin phê duyệt."
      />
      <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50 p-5 text-sm leading-7 text-slate-700">
        Seller vẫn là tài khoản và không gian riêng. Còn customer và affiliate được gom chung một tài khoản đăng nhập theo yêu cầu mới.
      </div>
      {submitError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {submitError}
        </div>
      ) : null}
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Thông tin affiliate</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Họ tên" error={errors.fullName?.message} {...register("fullName")} />
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Thông tin nhận tiền</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Phương thức thanh toán"
              error={errors.paymentMethod?.message}
              hint="Có thể chọn từ gợi ý hoặc tự nhập như BANK_TRANSFER, MoMo, VNPay."
              placeholder="Nhập hoặc chọn phương thức thanh toán"
              list="affiliate-payment-methods"
              {...register("paymentMethod")}
            />
            <Input
              label={bankNameLabel}
              error={errors.bankName?.message}
              hint={bankNameHint}
              placeholder={bankNamePlaceholder}
              list="affiliate-bank-names"
              {...register("bankName")}
            />
            <Input label="Tên chủ tài khoản" error={errors.bankAccountName?.message} {...register("bankAccountName")} />
            <Input
              label={accountNumberLabel}
              error={errors.bankAccountNumber?.message}
              hint={accountNumberHint}
              placeholder={accountNumberPlaceholder}
              {...register("bankAccountNumber")}
            />
          </div>
          <datalist id="affiliate-payment-methods">
            {PAYMENT_METHOD_OPTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <datalist id="affiliate-bank-names">
            {BANK_OPTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" loading={isSubmitting}>Kích hoạt vai trò affiliate</Button>
          <Link to="/dashboard/customer/profile">
            <Button type="button" variant="secondary">Quay lại customer</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default CustomerAffiliatePage;
