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
          setError(loadError.response?.data?.message || "Khong tai duoc thong tin shop.");
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
      toast.success("Da cap nhat thong tin shop.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc thong tin shop.");
    }
  }

  if (loading) {
    return <EmptyState title="Dang tai thong tin shop" description="He thong dang doc profile seller tu backend." />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc thong tin shop" description={error} />;
  }

  const paymentAccount = profile?.paymentAccounts?.[0] || null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Quan ly shop"
        description="Form nay chi cho phep sua cac truong ma backend seller profile dang ho tro luu thuc te."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form
          className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Section
            title="Thong tin co ban"
            description="Cap nhat ten shop, linh vuc kinh doanh va thong tin nhan dien co ban cua shop."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Ten shop" error={errors.shopName?.message} {...register("shopName")} />
              <Input label="Linh vuc kinh doanh" error={errors.businessField?.message} {...register("businessField")} />
            </div>
          </Section>

          <Section
            title="Lien he"
            description="Du lieu trong phan nay dang noi truc tiep voi seller profile backend."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Email lien he" error={errors.contactEmail?.message} {...register("contactEmail")} />
              <Input label="So dien thoai" error={errors.phone?.message} {...register("phone")} />
            </div>
            <Input label="Dia chi" error={errors.address?.message} {...register("address")} />
          </Section>

          <Section
            title="Mo ta shop"
            description="Thong tin nay duoc dung de gioi thieu shop tren he thong va cac bao cao noi bo."
          >
            <Input label="Mo ta shop" error={errors.shopDescription?.message} {...register("shopDescription")} />
          </Section>

          <Section
            title="Phap ly"
            description="Thong tin phap ly duoc luu tren seller profile. Tai khoan thanh toan hien dang xem o panel ben phai."
          >
            <Input
              label="Ma so thue / thong tin phap ly"
              error={errors.taxCode?.message}
              {...register("taxCode")}
            />
          </Section>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={isSubmitting}>
              Luu thong tin shop
            </Button>
            <Button type="button" variant="secondary" onClick={() => reset(buildFormValues(profile))}>
              Dat lai form
            </Button>
          </div>

          {isSubmitSuccessful ? (
            <p className="text-sm text-emerald-700">Thong tin shop da duoc gui cap nhat.</p>
          ) : null}
        </form>

        <div className="space-y-6">
          <InfoPanel
            title="Trang thai shop"
            rows={[
              { label: "Shop", value: profile?.shopName || "--" },
              { label: "Trang thai", value: profile?.approvalStatus || "APPROVED" },
              {
                label: "Ngay tham gia",
                value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "--",
              },
            ]}
          />

          <InfoPanel
            title="Tai khoan thanh toan"
            rows={[
              { label: "Trang thai", value: paymentAccount ? "Da cau hinh" : "Chua co" },
              { label: "Loai", value: paymentAccount?.type || "--" },
              { label: "Ngan hang", value: paymentAccount?.bankName || "--" },
              { label: "Chu tai khoan", value: paymentAccount?.accountName || "--" },
              { label: "So tai khoan", value: paymentAccount?.accountNumber || "--" },
            ]}
          />

          <InfoPanel
            title="Ghi chu van hanh"
            rows={[
              { label: "KYC", value: profile?.kyc?.status || "PENDING" },
              {
                label: "Media branding",
                value: "Chua ho tro upload logo/banner trong seller profile runtime.",
              },
              {
                label: "Luong duyet",
                value: "Seller duoc admin duyet truoc khi van hanh affiliate.",
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
