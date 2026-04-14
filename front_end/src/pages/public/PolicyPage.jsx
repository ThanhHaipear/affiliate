import PageHeader from "../../components/common/PageHeader";

const policySections = [
  {
    title: "Chính sách hoa hồng affiliate",
    description:
      "Hoa hồng chỉ được ghi nhận khi đơn hàng thành công và seller xác nhận đã nhận tiền. Đơn hủy hoặc refund sẽ không được tính commission.",
  },
  {
    title: "Chính sách thanh toán và phí nền tảng",
    description:
      "Website áp dụng phí nền tảng mặc định 5% trên các giao dịch hợp lệ và tách biệt rõ doanh thu seller, commission affiliate và doanh thu nền tảng.",
  },
  {
    title: "Chính sách duyệt tài khoản và sản phẩm",
    description:
      "Seller, affiliate và sản phẩm tham gia affiliate đều phải qua bước duyệt của admin trước khi được kích hoạt trong hệ thống.",
  },
];

function PolicyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Chính sách"
        title="Chính sách vận hành nền tảng"
        description="Tổng hợp các nguyên tắc xác nhận đơn hàng, ghi nhận commission, phí nền tảng và kiểm soát tài khoản."
      />
      <div className="space-y-4">
        {policySections.map((section) => (
          <div key={section.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{section.title}</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">{section.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PolicyPage;
