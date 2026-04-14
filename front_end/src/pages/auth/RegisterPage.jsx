import { Link } from "react-router-dom";
import Button from "../../components/common/Button";

const roles = [
  {
    title: "Customer",
    description: "Mua hang, quan ly gio hang, checkout va theo doi don hang. Khi can, cung tai khoan nay co the kich hoat them vai tro affiliate.",
    to: "/auth/register/customer",
  },
  {
    title: "Seller",
    description: "Tao shop, dang san pham va van hanh don affiliate trong mot khong gian rieng cho nha ban hang.",
    to: "/auth/register/seller",
  },
];

function RegisterPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-700">Auth</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Chon loai tai khoan</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Customer va affiliate dung chung mot tai khoan. Seller dang ky o mot luong rieng.
        </p>
      </div>
      <div className="grid gap-4">
        {roles.map((role) => (
          <div key={role.to} className="rounded-[2rem] border border-slate-300 bg-slate-50 p-5 shadow-sm">
            <p className="text-lg font-semibold text-slate-900">{role.title}</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">{role.description}</p>
            <Link to={role.to} className="mt-4 block">
              <Button className="w-full">Dang ky {role.title}</Button>
            </Link>
          </div>
        ))}
      </div>
      <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4 text-sm leading-7 text-slate-700">
        Sau khi da co tai khoan customer, nguoi dung co the mo them vai tro affiliate ngay trong dashboard customer ma khong can tao account moi.
      </div>
      <Link to="/auth/login" className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-900">
        Da co tai khoan? Dang nhap
      </Link>
    </div>
  );
}

export default RegisterPage;
