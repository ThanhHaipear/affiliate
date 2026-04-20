import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { getSellerProfile, updateSellerProfile } from "../../../api/sellerApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { sellerShopSchema } from "../../../schemas/sellerPortalSchemas";
import { formatStatusLabel } from "../../../lib/format";

function SellerShopPage() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm({
    resolver: zodResolver(sellerShopSchema),
    defaultValues: {
      shopName: "",
      contactEmail: "",
      phone: "",
      address: "",
      businessField: "",
      shopDescription: "",
      taxCode: "",
    },
  });

  function buildFormValues(source) {
    return {
      shopName: source?.shopName || "",
      contactEmail: source?.email || "",
      phone: source?.phone || "",
      address: source?.address || "",
      businessField: source?.businessField || "",
      shopDescription: source?.shopDescription || "",
      taxCode: source?.taxCode || "",
    };
  }

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const response = await getSellerProfile();

        if (!active) {
          return;
        }

        setProfile(response || null);
        reset(buildFormValues(response));
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được thông tin shop.");
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

  async function onSubmit(values) {
    try {
      await updateSellerProfile({
        shopName: values.shopName,
        email: values.contactEmail,
        phone: values.phone,
        address: values.address,
        businessField: values.businessField,
        shopDescription: values.shopDescription,
        taxCode: values.taxCode,
      });

      const refreshedProfile = await getSellerProfile();
      setProfile(refreshedProfile || null);
      reset(buildFormValues(refreshedProfile));
      toast.success("Đã cập nhật thông tin shop.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được thông tin shop.");
    }
  }

  if (loading) {
    return (
      <EmptyState
        title="Đang tải thông tin shop"
        description="Hệ thống đang đọc hồ sơ seller từ backend."
      />
    );
  }

  if (error) {
    return <EmptyState title="Không tải được thông tin shop" description={error} />;
  }

  const paymentAccount = profile?.paymentAccounts?.[0] || null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Quản lý shop"

      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Section
            title="Thông tin cơ bản"
            description="Cập nhật tên shop, lĩnh vực kinh doanh và các thông tin nhận diện cơ bản."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Tên shop" error={errors.shopName?.message} {...register("shopName")} />
              <Input
                label="Lĩnh vực kinh doanh"
                error={errors.businessField?.message}
                {...register("businessField")}
              />
            </div>
          </Section>

          <Section
            title="Thông tin liên hệ"
            description="Các trường này đang kết nối trực tiếp với hồ sơ seller trên backend."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Email liên hệ" error={errors.contactEmail?.message} {...register("contactEmail")} />
              <Input label="Số điện thoại" error={errors.phone?.message} {...register("phone")} />
            </div>
            <Input label="Địa chỉ" error={errors.address?.message} {...register("address")} />
          </Section>

          <Section
            title="Mô tả shop"
            description="Thông tin này được dùng để giới thiệu shop trên hệ thống và các báo cáo nội bộ."
          >
            <Input
              label="Mô tả shop"
              error={errors.shopDescription?.message}
              {...register("shopDescription")}
            />
          </Section>

          <Section
            title="Thông tin pháp lý"
            description="Thông tin pháp lý được lưu trên seller profile. Tài khoản thanh toán mặc định hiển thị ở panel bên phải."
          >
            <Input
              label="Mã số thuế / thông tin pháp lý"
              error={errors.taxCode?.message}
              {...register("taxCode")}
            />
          </Section>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={isSubmitting}>
              Lưu thông tin shop
            </Button>
            <Button type="button" variant="secondary" onClick={() => reset(buildFormValues(profile))}>
              Đặt lại form
            </Button>
          </div>

          {isSubmitSuccessful ? (
            <p className="text-sm text-emerald-700">Thông tin shop đã được gửi cập nhật thành công.</p>
          ) : null}
        </form>

        <div className="space-y-6">
          <InfoPanel
            title="Trạng thái shop"
            rows={[
              { label: "Shop", value: profile?.shopName || "--" },
              { label: "Trạng thái", value: formatStatusLabel(profile?.approvalStatus || "APPROVED") },
              {
                label: "Ngày tham gia",
                value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "--",
              },
            ]}
          />

          <InfoPanel
            title="Tài khoản thanh toán"
            rows={[
              { label: "Trạng thái", value: paymentAccount ? "Đã cấu hình" : "Chưa có" },
              { label: "Loại", value: paymentAccount?.type || "--" },
              { label: "Ngân hàng", value: paymentAccount?.bankName || "--" },
              { label: "Chủ tài khoản", value: paymentAccount?.accountName || "--" },
              { label: "Số tài khoản", value: paymentAccount?.accountNumber || "--" },
            ]}
          />

          <InfoPanel
            title="Ghi chú vận hành"
            rows={[
              { label: "KYC", value: formatStatusLabel(profile?.kyc?.status || "PENDING") },
              {
                label: "Nhận diện thương hiệu",
                value: "Hiện chưa hỗ trợ upload logo hoặc banner trực tiếp trong giao diện seller runtime.",
              },
              {
                label: "Luồng duyệt",
                value: "Seller cần được admin duyệt trước khi vận hành đầy đủ trên hệ thống.",
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function InfoPanel({ title, rows }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <div className="mt-5 space-y-4">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 text-sm last:border-b-0 last:pb-0"
          >
            <span className="text-slate-500">{row.label}</span>
            <span className="max-w-[60%] text-right font-medium text-slate-900">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SellerShopPage;
