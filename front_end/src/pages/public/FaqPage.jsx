import PageHeader from "../../components/common/PageHeader";
import FAQAccordion from "../../components/storefront/FAQAccordion";

const faqs = [
  {
    group: "Nền tảng",
    question: "Khi nào affiliate được ghi nhận hoa hồng?",
    answer:
      "Chỉ khi đơn hàng thành công và seller xác nhận đã nhận tiền. Nếu đơn bị hủy hoặc refund, commission sẽ không được tính.",
  },
  {
    group: "Seller",
    question: "Seller có cần admin duyệt mới được bán hàng không?",
    answer:
      "Có. Seller cần được duyệt tài khoản, sau đó mới có thể đăng sản phẩm và gửi sản phẩm vào chương trình affiliate.",
  },
  {
    group: "Buyer",
    question: "Customer có thấy thông tin hoa hồng không?",
    answer:
      "Không. Customer chỉ thấy giá, trạng thái đơn, thanh toán và vận chuyển. Dữ liệu commission là nội bộ cho affiliate, seller và admin.",
  },
  {
    group: "Nền tảng",
    question: "Phí nền tảng được tính như thế nào?",
    answer:
      "Phí nền tảng mặc định là 5 phần trăm, được ghi nhận khi đơn hàng hợp lệ và đủ điều kiện theo nghiệp vụ hệ thống.",
  },
];

function FaqPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="FAQ"
        title="Câu hỏi thường gặp"
        description="Tổng hợp các câu hỏi về duyệt tài khoản, commission, order flow và phí nền tảng."
      />
      <FAQAccordion items={faqs} />
    </div>
  );
}

export default FaqPage;
