import { Link } from "react-router-dom";
import Button from "../../components/common/Button";

function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-rose-300">404</p>
      <h1 className="mt-4 text-4xl font-semibold text-white">Trang khong ton tai</h1>
      <p className="mt-4 text-sm leading-7 text-slate-300">
        Duong dan ban truy cap chua duoc khai bao hoac da bi thay doi.
      </p>
      <div className="mt-6">
        <Link to="/">
          <Button>Ve trang chu</Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
