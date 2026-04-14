import PageHeader from "../../components/common/PageHeader";

function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Giới thiệu"
        title="Nền tảng tiếp thị liên kết đa vai trò"
        description="Hệ thống kết hợp ecommerce storefront, affiliate marketplace và dashboard vận hành cho admin, seller, affiliate, customer."
      />
      <div className="grid gap-5 md:grid-cols-2">
        <InfoBlock
          title="Một hành trình xuyên suốt"
          description="Seller đăng ký và chờ duyệt, affiliate lấy link, customer mua hàng, seller xác nhận nhận tiền, hệ thống mới ghi nhận hoa hồng và phí nền tảng."
        />
        <InfoBlock
          title="Kiến trúc frontend dễ mở rộng"
          description="React Router tách theo vai trò, reusable component cho card, table, form, modal, empty state và loading state để dễ nối backend thật."
        />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Admin", "Kiểm duyệt hệ thống, fraud, settings"],
          ["Seller", "Quản lý shop, sản phẩm, doanh thu"],
          ["Affiliate", "Lấy link, theo dõi click, commission"],
          ["Customer", "Mua hàng, checkout, theo dõi đơn"],
        ].map(([title, description]) => (
          <div key={title} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{title}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBlock({ title, description }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600 shadow-sm">
      <p className="text-xl font-semibold text-slate-900">{title}</p>
      <p className="mt-4">{description}</p>
    </div>
  );
}

export default AboutPage;
