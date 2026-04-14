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

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, isSubmitSuccessful } } = useForm({
    resolver: zodResolver(sellerShopSchema),
    defaultValues: {
      shopName: "",
      contactEmail: "",
      phone: "",
      address: "",
      businessField: "",
      shopDescription: "",
      taxCode: "",
      bankName: "",
      accountName: "",
      accountNumber: "",
    },
  });

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const response = await getSellerProfile();
        if (!active) return;
        setProfile(response || null);
        const payment = response?.paymentAccounts?.[0] || {};
        reset({
          shopName: response?.shopName || "",
          contactEmail: response?.email || "",
          phone: response?.phone || "",
          address: response?.address || "",
          businessField: response?.businessField || "",
          shopDescription: response?.shopDescription || "",
          taxCode: response?.taxCode || "",
          bankName: payment.bankName || "",
          accountName: payment.accountName || "",
          accountNumber: payment.accountNumber || "",
        });
      } catch (loadError) {
        if (active) setError(loadError.response?.data?.message || "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c th\u00f4ng tin shop.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProfile();
    return () => { active = false; };
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
      toast.success("\u0110\u00e3 c\u1eadp nh\u1eadt th\u00f4ng tin shop.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Kh\u00f4ng c\u1eadp nh\u1eadt \u0111\u01b0\u1ee3c th\u00f4ng tin shop.");
    }
  }

  if (loading) return <EmptyState title={"\u0110ang t\u1ea3i th\u00f4ng tin shop"} description={"H\u1ec7 th\u1ed1ng \u0111ang \u0111\u1ecdc profile seller t\u1eeb backend."} />;
  if (error) return <EmptyState title={"Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c th\u00f4ng tin shop"} description={error} />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Seller" title={"Qu\u1ea3n l\u00fd shop"} description={"C\u1eadp nh\u1eadt th\u00f4ng tin shop theo t\u1eebng section r\u00f5 r\u00e0ng: c\u01a1 b\u1ea3n, li\u00ean h\u1ec7, m\u00f4 t\u1ea3, thanh to\u00e1n v\u00e0 ph\u00e1p l\u00fd."} />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <form className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm" onSubmit={handleSubmit(onSubmit)}>
          <Section title={"Th\u00f4ng tin c\u01a1 b\u1ea3n"} description={"T\u00ean shop, l\u0129nh v\u1ef1c kinh doanh v\u00e0 h\u00ecnh \u1ea3nh nh\u1eadn di\u1ec7n \u0111ang \u1edf ch\u1ebf \u0111\u1ed9 UI preview."}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label={"T\u00ean shop"} error={errors.shopName?.message} {...register("shopName")} />
              <Input label={"L\u0129nh v\u1ef1c kinh doanh"} error={errors.businessField?.message} {...register("businessField")} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <MockUploadBox title={"Logo shop"} helper={"Upload gi\u1ea3 l\u1eadp \u0111\u1ec3 seller preview b\u1ed9 nh\u1eadn di\u1ec7n."} />
              <MockUploadBox title={"Banner shop"} helper={"Khu v\u1ef1c banner d\u00f9ng cho store profile trong b\u1ea3n seller prompt."} />
            </div>
          </Section>

          <Section title={"Li\u00ean h\u1ec7"} description={"Th\u00f4ng tin n\u00e0y \u0111ang n\u1ed1i tr\u1ef1c ti\u1ebfp v\u1edbi seller profile backend."}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label={"Email li\u00ean h\u1ec7"} error={errors.contactEmail?.message} {...register("contactEmail")} />
              <Input label={"S\u1ed1 \u0111i\u1ec7n tho\u1ea1i"} error={errors.phone?.message} {...register("phone")} />
            </div>
            <Input label={"\u0110\u1ecba ch\u1ec9"} error={errors.address?.message} {...register("address")} />
          </Section>

          <Section title={"M\u00f4 t\u1ea3 shop"} description={"Seller portal c\u1ea7n cho ph\u00e9p c\u1eadp nh\u1eadt positioning v\u00e0 m\u00f4 t\u1ea3 n\u0103ng l\u1ef1c shop."}>
            <Input label={"M\u00f4 t\u1ea3 shop"} error={errors.shopDescription?.message} {...register("shopDescription")} />
          </Section>

          <Section title={"Thanh to\u00e1n v\u00e0 ph\u00e1p l\u00fd"} description={"Th\u00f4ng tin ph\u00e1p l\u00fd \u0111ang l\u01b0u th\u1eadt tr\u00ean seller profile. T\u00e0i kho\u1ea3n thanh to\u00e1n hi\u1ec7n \u0111\u01b0\u1ee3c \u0111\u1ecdc t\u1eeb database v\u00e0 c\u00f3 th\u1ec3 m\u1edf r\u1ed9ng th\u00eam endpoint c\u1eadp nh\u1eadt ri\u00eang sau n\u00e0y."}>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label={"M\u00e3 s\u1ed1 thu\u1ebf / th\u00f4ng tin ph\u00e1p l\u00fd"} error={errors.taxCode?.message} {...register("taxCode")} />
              <Input label={"T\u00ean ng\u00e2n h\u00e0ng"} error={errors.bankName?.message} {...register("bankName")} />
              <Input label={"Ch\u1ee7 t\u00e0i kho\u1ea3n"} error={errors.accountName?.message} {...register("accountName")} />
              <Input label={"S\u1ed1 t\u00e0i kho\u1ea3n"} error={errors.accountNumber?.message} {...register("accountNumber")} />
            </div>
          </Section>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={isSubmitting}>{"L\u01b0u th\u00f4ng tin shop"}</Button>
            <Button type="button" variant="secondary" onClick={() => reset()}>{"\u0110\u1eb7t l\u1ea1i form"}</Button>
          </div>
          {isSubmitSuccessful ? <p className="text-sm text-emerald-700">{"Form h\u1ee3p l\u1ec7. Th\u00f4ng tin shop \u0111\u00e3 \u0111\u01b0\u1ee3c g\u1eedi c\u1eadp nh\u1eadt."}</p> : null}
        </form>

        <div className="space-y-6">
          <InfoPanel title={"Tr\u1ea1ng th\u00e1i shop"} rows={[{ label: "Shop", value: profile?.shopName || "--" }, { label: "Tr\u1ea1ng th\u00e1i", value: profile?.approvalStatus || "APPROVED" }, { label: "Ng\u00e0y tham gia", value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("vi-VN") : "--" }]} />
          <InfoPanel title={"Ghi ch\u00fa v\u1eadn h\u00e0nh"} rows={[{ label: "KYC", value: profile?.kyc?.status || "PENDING" }, { label: "T\u00e0i kho\u1ea3n thanh to\u00e1n", value: profile?.paymentAccounts?.length ? "\u0110\u00e3 c\u1ea5u h\u00ecnh" : "Ch\u01b0a c\u00f3" }, { label: "Lu\u1ed3ng duy\u1ec7t", value: "Seller \u0111\u01b0\u1ee3c admin duy\u1ec7t tr\u01b0\u1edbc khi v\u1eadn h\u00e0nh affiliate." }]} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, description, children }) {
  return <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-5"><div><h3 className="text-lg font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm text-slate-600">{description}</p></div>{children}</section>;
}

function MockUploadBox({ title, helper }) {
  return <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-5"><p className="text-sm font-medium text-slate-900">{title}</p><p className="mt-2 text-sm leading-7 text-slate-500">{helper}</p></div>;
}

function InfoPanel({ title, rows }) {
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-semibold text-slate-900">{title}</h3><div className="mt-5 space-y-4">{rows.map((row) => <div key={row.label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 text-sm last:border-b-0 last:pb-0"><span className="text-slate-500">{row.label}</span><span className="max-w-[60%] text-right font-medium text-slate-900">{row.value}</span></div>)}</div></div>;
}

export default SellerShopPage;