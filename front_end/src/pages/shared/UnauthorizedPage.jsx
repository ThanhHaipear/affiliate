import { Link, useLocation } from "react-router-dom";
import Button from "../../components/common/Button";

function UnauthorizedPage() {
  const location = useLocation();
  const isLocked = location.state?.reason === "locked";

  const eyebrow = isLocked ? "Tài khoản bị khóa" : "Không được phép truy cập";
  const title = isLocked ? "Tài khoản của bạn đã bị khóa" : "Bạn không có quyền truy cập";
  const description = isLocked
    ? "Tài khoản này đã bị khóa toàn bộ vai trò. Bạn sẽ không thể tiếp tục sử dụng dashboard hoặc khu vực quản trị cho đến khi được mở khóa."
    : "Tài khoản hiện tại không phù hợp với khu vực bạn đang mở. Hãy quay lại đúng khu vực dành cho vai trò của bạn.";
  const helper = isLocked
    ? "Nếu đây là nhầm lẫn, vui lòng liên hệ quản trị viên để kiểm tra lý do khóa và thời điểm mở lại tài khoản."
    : "Bạn vẫn có thể quay lại trang trước hoặc trở về trang chủ để tiếp tục sử dụng các khu vực còn được phép truy cập.";

  return (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_45%,#f8fafc_100%)] px-6 py-10 shadow-[0_32px_80px_rgba(15,23,42,0.10)] sm:px-10">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -left-12 top-8 h-40 w-40 rounded-full blur-3xl ${isLocked ? "bg-rose-200/60" : "bg-amber-200/70"}`} />
        <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-sky-200/40 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-2xl text-center">
        <div
          className={`mx-auto flex h-18 w-18 items-center justify-center rounded-[1.75rem] border text-3xl shadow-sm ${
            isLocked
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-amber-200 bg-amber-50 text-amber-600"
          }`}
        >
          {isLocked ? "!" : "?"}
        </div>

        <p className={`mt-6 text-xs font-semibold uppercase tracking-[0.32em] ${isLocked ? "text-rose-600" : "text-amber-600"}`}>
          {eyebrow}
        </p>

        <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-5xl">
          {title}
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-8 text-slate-600">
          {description}
        </p>

        <div
          className={`mx-auto mt-7 max-w-xl rounded-[1.75rem] border px-5 py-4 text-sm leading-7 ${
            isLocked
              ? "border-rose-200 bg-white/80 text-slate-700"
              : "border-amber-200 bg-white/80 text-slate-700"
          }`}
        >
          {helper}
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="min-w-36" onClick={() => window.history.back()}>
            Quay lại
          </Button>
          <Link to="/">
            <Button variant="secondary" className="min-w-36">
              Về trang chủ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
