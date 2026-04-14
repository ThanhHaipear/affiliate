import Button from "../../components/common/Button";

function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Unauthorized</p>
      <h1 className="mt-4 text-4xl font-semibold text-white">Ban khong co quyen truy cap</h1>
      <p className="mt-4 text-sm leading-7 text-slate-300">
        Tai khoan hien tai khong phu hop voi route duoc yeu cau. Hay quay lai khu vuc phu hop voi
        vai tro cua ban.
      </p>
      <div className="mt-6">
        <Button onClick={() => window.history.back()}>Quay lai</Button>
      </div>
    </div>
  );
}

export default UnauthorizedPage;
