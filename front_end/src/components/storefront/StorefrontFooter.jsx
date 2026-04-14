import { Link } from "react-router-dom";

function StorefrontFooter() {
  return (
    <footer className="mt-16 border-t border-slate-300 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 text-sm text-slate-700 sm:px-6 lg:grid-cols-[1.2fr_0.9fr_0.9fr_1fr] lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Affiliate Commerce</p>
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Nền tảng mua hàng và tiếp thị liên kết</h3>
          <p className="mt-3 leading-7">
            Kết nối người mua, người bán và affiliate trong một trải nghiệm rõ ràng, minh bạch và sẵn
            sàng nối backend thật.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-2">Người bán được duyệt</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">Affiliate được duyệt</span>
            <span className="rounded-full bg-slate-100 px-3 py-2">Phí nền tảng 5%</span>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">Liên hệ</h4>
          <p className="mt-3">Hotline: 1900 6868</p>
          <p className="mt-2">Email: support@affiliate-commerce.vn</p>
          <p className="mt-2">TP.HCM, Việt Nam</p>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">Khám phá</h4>
          <div className="mt-3 space-y-2">
            <Link to="/about" className="block hover:text-slate-900">Về nền tảng</Link>
            <Link to="/products" className="block hover:text-slate-900">Sàn giao dịch</Link>
            <Link to="/faq" className="block hover:text-slate-900">FAQ</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">Chính sách</h4>
          <div className="mt-3 space-y-2">
            <Link to="/policies" className="block hover:text-slate-900">Chính sách thanh toán</Link>
            <Link to="/policies" className="block hover:text-slate-900">Điều khoản affiliate</Link>
            <Link to="/contact" className="block hover:text-slate-900">Hỗ trợ người bán và affiliate</Link>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900">Cộng đồng</h4>
          <div className="mt-3 space-y-2">
            <p>Facebook: /affiliatecommercevn</p>
            <p>Zalo OA: Affiliate Commerce</p>
            <p>TikTok: @affiliatecommerce.vn</p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default StorefrontFooter;
