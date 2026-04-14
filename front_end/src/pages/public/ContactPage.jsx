import PageHeader from "../../components/common/PageHeader";

function ContactPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Liên hệ"
        title="Liên hệ và hỗ trợ"
        description="Kênh liên hệ tổng đài, email và bộ phận hỗ trợ dành riêng cho seller, affiliate và customer."
      />
      <div className="grid gap-5 md:grid-cols-3">
        <ContactCard title="Hỗ trợ khách hàng" value="1900 6868" detail="Hỗ trợ đơn hàng, thanh toán, vận chuyển" />
        <ContactCard title="Bộ phận seller" value="seller@affiliate-commerce.vn" detail="Hỗ trợ onboarding, shop, sản phẩm" />
        <ContactCard title="Bộ phận affiliate" value="affiliate@affiliate-commerce.vn" detail="Hỗ trợ link, commission, payout" />
      </div>
    </div>
  );
}

function ContactCard({ title, value, detail }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-3 text-sm leading-7 text-slate-600">{detail}</p>
    </div>
  );
}

export default ContactPage;
