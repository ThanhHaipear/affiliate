import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { getAffiliateProfile, updateAffiliateProfile, uploadAffiliateAvatar } from "../../../api/affiliateApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime, formatStatusLabel } from "../../../lib/format";
import { affiliateProfileFormSchema } from "../../../schemas/affiliatePortalSchemas";

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

const CHANNEL_PLATFORM_OPTIONS = ["Facebook", "TikTok", "YouTube", "Instagram", "Website", "Telegram", "Zalo"];

const normalizePaymentType = (value = "") => String(value || "").trim().toUpperCase();
const isBankTransferMethod = (value = "") => normalizePaymentType(value) === "BANK_TRANSFER";

const buildFormValues = (profile) => {
  const primaryChannel = profile?.primaryChannel || profile?.channels?.[0];
  const paymentAccount = profile?.defaultPaymentAccount || profile?.paymentAccounts?.[0];

  return {
    fullName: profile?.fullName || "",
    phone: profile?.account?.phone || "",
    avatarUrl: profile?.avatarUrl || "",
    channelPlatform: primaryChannel?.platform || primaryChannel?.name || "",
    channelUrl: primaryChannel?.url || "",
    channelDescription: primaryChannel?.description || "",
    paymentType: paymentAccount?.type || "",
    paymentAccountName: paymentAccount?.accountName || paymentAccount?.bankAccountName || "",
    paymentAccountNumber: paymentAccount?.accountNumber || paymentAccount?.bankAccountNumber || "",
    paymentBankName: paymentAccount?.bankName || paymentAccount?.providerName || "",
    paymentBranch: paymentAccount?.branch || paymentAccount?.note || "",
  };
};

function AffiliateProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(affiliateProfileFormSchema),
    defaultValues: buildFormValues(null),
  });

  const paymentType = watch("paymentType");
  const avatarUrl = watch("avatarUrl");
  const isBankTransfer = useMemo(() => isBankTransferMethod(paymentType), [paymentType]);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const response = await getAffiliateProfile();
        if (active) {
          setProfile(response || null);
          reset(buildFormValues(response));
          setAvatarPreview(response?.avatarUrl || "");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được hồ sơ affiliate.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [reset]);

  useEffect(() => {
    setAvatarPreview(avatarUrl || "");
  }, [avatarUrl]);

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      setAvatarUploading(true);
      const uploadedAvatar = await uploadAffiliateAvatar(file);
      if (!uploadedAvatar?.url) {
        throw new Error("Không nhận được URL ảnh từ hệ thống upload.");
      }

      setValue("avatarUrl", uploadedAvatar.url, { shouldDirty: true, shouldValidate: true });
      toast.success("Đã tải ảnh avatar lên Cloudinary.");
    } catch (uploadError) {
      toast.error(uploadError.response?.data?.message || uploadError.message || "Không tải được ảnh avatar.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  }

  async function onSubmit(values) {
    try {
      const response = await updateAffiliateProfile({
        fullName: values.fullName,
        phone: values.phone || undefined,
        avatarUrl: values.avatarUrl || undefined,
        channelPlatform: values.channelPlatform || undefined,
        channelUrl: values.channelUrl || undefined,
        channelDescription: values.channelDescription || undefined,
        paymentType: values.paymentType || undefined,
        paymentAccountName: values.paymentAccountName || undefined,
        paymentAccountNumber: values.paymentAccountNumber || undefined,
        paymentBankName: values.paymentBankName || undefined,
        paymentBranch: values.paymentBranch || undefined,
      });

      setProfile(response || null);
      reset(buildFormValues(response));
      setAvatarPreview(response?.avatarUrl || "");
      toast.success("Đã cập nhật hồ sơ affiliate.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được hồ sơ affiliate.");
    }
  }

  if (loading) {
    return <EmptyState title="Đang tải hồ sơ affiliate" description="Hệ thống đang lấy hồ sơ affiliate từ backend." />;
  }

  if (error || !profile) {
    return <EmptyState title="Không tải được hồ sơ affiliate" description={error || "Chưa có dữ liệu affiliate."} />;
  }

  const paymentAccount = profile.defaultPaymentAccount || profile.paymentAccounts?.[0];
  const channel = profile.primaryChannel || profile.channels?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Affiliate"
        title="Hồ sơ affiliate"
        description="Chỉnh sửa thông tin liên hệ, kênh quảng bá chính và tài khoản nhận tiền mặc định ngay trên một màn hình."
      />
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <form className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit(onSubmit)}>
          <Section title="Thông tin hồ sơ" description="Các thay đổi ở đây sẽ lưu trực tiếp xuống tài khoản affiliate hiện tại.">
            <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 shadow-sm">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar affiliate" className="h-44 w-full object-cover" />
                  ) : (
                    <div className="flex h-44 items-center justify-center px-4 text-center text-sm text-slate-500">
                      Chưa có avatar. Hãy chọn ảnh từ máy để tải lên Cloudinary.
                    </div>
                  )}
                </div>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-800">Ảnh avatar</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="block w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 file:mr-3 file:rounded-xl file:border-0 file:bg-sky-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-sky-800"
                  />
                  <span className="text-xs text-slate-500">
                    {avatarUploading ? "Đang tải ảnh lên Cloudinary..." : "Chọn ảnh từ máy. Hệ thống sẽ upload lên Cloudinary trước khi lưu hồ sơ."}
                  </span>
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Họ tên" error={errors.fullName?.message} {...register("fullName")} />
                <Input label="Số điện thoại" placeholder="Nhập số điện thoại" error={errors.phone?.message} {...register("phone")} />
                <div className="md:col-span-2">
                  <Input
                    label="URL avatar"
                    readOnly
                    value={avatarUrl || ""}
                    hint="URL này được tạo tự động sau khi upload ảnh lên Cloudinary."
                  />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Kênh quảng bá chính" description="Nếu affiliate đã có kênh, hệ thống sẽ cập nhật kênh gần nhất. Nếu chưa có, hệ thống sẽ tạo mới.">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nền tảng"
                list="affiliate-channel-platforms"
                placeholder="Ví dụ: TikTok, Facebook, YouTube"
                error={errors.channelPlatform?.message}
                {...register("channelPlatform")}
              />
              <Input label="URL kênh" placeholder="https://..." error={errors.channelUrl?.message} {...register("channelUrl")} />
              <div className="md:col-span-2">
                <Input
                  label="Mô tả ngắn"
                  placeholder="Mô tả ngắn về kênh hoặc nội dung bạn đang làm"
                  error={errors.channelDescription?.message}
                  {...register("channelDescription")}
                />
              </div>
            </div>
            <datalist id="affiliate-channel-platforms">
              {CHANNEL_PLATFORM_OPTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </Section>

          <Section title="Tài khoản nhận tiền mặc định" description="Nếu đã có tài khoản nhận tiền, hệ thống sẽ cập nhật tài khoản mặc định hiện tại. Nếu chưa có, hệ thống sẽ tạo mới.">
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Phương thức thanh toán"
                list="affiliate-payment-methods"
                placeholder="Nhập hoặc chọn phương thức"
                hint="Có thể nhập tay hoặc chọn từ gợi ý: BANK_TRANSFER, MoMo, VNPay."
                error={errors.paymentType?.message}
                {...register("paymentType")}
              />
              <Input
                label={isBankTransfer ? "Tên ngân hàng" : "Nhà cung cấp / Ví điện tử"}
                list="affiliate-bank-options"
                placeholder={isBankTransfer ? "Nhập hoặc chọn ngân hàng" : "Ví dụ: MoMo, VNPay"}
                hint={isBankTransfer ? "Bắt buộc khi chọn chuyển khoản ngân hàng." : "Không bắt buộc với ví điện tử nếu bạn không dùng trường này."}
                error={errors.paymentBankName?.message}
                {...register("paymentBankName")}
              />
              <Input label="Tên chủ tài khoản" placeholder="Tên người nhận tiền" error={errors.paymentAccountName?.message} {...register("paymentAccountName")} />
              <Input
                label={isBankTransfer ? "Số tài khoản" : "Số ví / Mã thanh toán"}
                placeholder={isBankTransfer ? "Nhập số tài khoản ngân hàng" : "Nhập số ví hoặc mã thanh toán"}
                error={errors.paymentAccountNumber?.message}
                {...register("paymentAccountNumber")}
              />
              <div className="md:col-span-2">
                <Input
                  label={isBankTransfer ? "Chi nhánh" : "Ghi chú thêm"}
                  placeholder={isBankTransfer ? "Chi nhánh ngân hàng (nếu có)" : "Thông tin bổ sung cho tài khoản nhận tiền"}
                  error={errors.paymentBranch?.message}
                  {...register("paymentBranch")}
                />
              </div>
            </div>
            <datalist id="affiliate-payment-methods">
              {PAYMENT_METHOD_OPTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
            <datalist id="affiliate-bank-options">
              {BANK_OPTIONS.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </Section>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={isSubmitting} disabled={avatarUploading}>
              Lưu hồ sơ
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                reset(buildFormValues(profile));
                setAvatarPreview(profile?.avatarUrl || "");
              }}
              disabled={isSubmitting || avatarUploading || !isDirty}
            >
              Đặt lại
            </Button>
          </div>
        </form>

        <div className="space-y-6">
          <Panel
            title="Tổng quan tài khoản"
            lines={[
              profile.fullName || "Affiliate profile",
              `Ngày tham gia: ${formatDateTime(profile.createdAt)}`,
              `Email: ${profile.account?.email || "--"}`,
              `Số điện thoại: ${profile.account?.phone || "--"}`,
            ]}
            badge={<StatusBadge status={profile.kycStatus || "PENDING"} />}
          />
          <Panel
            title="Kênh quảng bá chính"
            lines={[
              channel?.platform || "Chưa khai báo kênh",
              `URL: ${channel?.url || "--"}`,
              `Mô tả: ${channel?.description || "--"}`,
              `Trạng thái: ${formatStatusLabel(channel?.status || "ACTIVE")}`,
            ]}
          />
          <Panel
            title="Tài khoản nhận tiền"
            lines={[
              paymentAccount?.bankName || paymentAccount?.type || "Chưa có tài khoản nhận tiền",
              `Phương thức: ${paymentAccount?.type || "--"}`,
              `Chủ tài khoản: ${paymentAccount?.accountName || "--"}`,
              `${isBankTransferMethod(paymentAccount?.type) ? "Số tài khoản" : "Số ví / Mã thanh toán"}: ${paymentAccount?.accountNumber || "--"}`,
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Panel({ title, lines, badge }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <p className="text-slate-500">{title}</p>
        {badge}
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-900">{lines[0]}</p>
      {lines.slice(1).map((line) => (
        <p key={line} className="mt-2">
          {line}
        </p>
      ))}
    </div>
  );
}

export default AffiliateProfilePage;
