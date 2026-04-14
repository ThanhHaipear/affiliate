import { Link, useNavigate } from "react-router-dom";
import Button from "../common/Button";
import Input from "../common/Input";
import { useAuth } from "../../hooks/useAuth";
import { getInitials } from "../../lib/utils";

function AdminTopbar() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/auth/login");
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-[#081423]/85 px-6 py-4 backdrop-blur xl:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="hidden h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-sm font-semibold text-slate-950 sm:flex">
            {getInitials(currentUser?.profile?.fullName || currentUser?.email || "AD")}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.38em] text-cyan-200/70">Operations</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Admin overview</h2>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="min-w-[260px]">
            <Input
              aria-label="Global admin search"
              placeholder="Search account, product, order, or alert"
            />
          </div>
          <Link to="/admin/fraud-detection">
            <Button variant="outline">Risk queue</Button>
          </Link>
          <Button variant="secondary" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

export default AdminTopbar;
