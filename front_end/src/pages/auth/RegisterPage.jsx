import { Link } from "react-router-dom";
import Button from "../../components/common/Button";

const roles = [
  {
    title: "Customer",
    description: "Mua hàng, quản lý giỏ hàng, thanh toán và theo dõi đơn hàng. Khi cần, cùng tài khoản này có thể kích hoạt thêm vai trò affiliate.",
    to: "/auth/register/customer",
  },
  {
    title: "Seller",
    description: "Tạo shop, đăng sản phẩm và vận hành đơn affiliate trong một không gian riêng cho nhà bán hàng.",
    to: "/auth/register/seller",
  },
];

function RegisterPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Auth</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Chọn loại tài khoản</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Customer và affiliate dùng chung một tài khoản. Seller đăng ký ở một luồng riêng.
        </p>
      </div>
      <div className="grid gap-4">
        {roles.map((role) => (
          <div key={role.to} className="rounded-[2rem] border border-slate-300 bg-slate-50 p-5 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{role.title}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{role.description}</p>
            <Link to={role.to} className="mt-4 block">
              <Button className="w-full">Đăng ký {role.title}</Button>
            </Link>
          </div>
        ))}
      </div>
      <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-slate-700">
        Sau khi đã có tài khoản customer, người dùng có thể mở thêm vai trò affiliate ngay trong dashboard customer mà không cần tạo tài khoản mới.
      </div>
      <Link to="/auth/login" className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-900">
        Đã có tài khoản? Đăng nhập
      </Link>
    </div>
  );
}

export default RegisterPage;
