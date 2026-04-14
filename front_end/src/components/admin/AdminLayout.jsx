import { Outlet } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

function AdminLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(180deg,#07101c_0%,#0b1526_45%,#08111d_100%)] text-white">
      <div className="grid min-h-screen lg:grid-cols-[300px_1fr]">
        <AdminSidebar />
        <div className="min-w-0">
          <AdminTopbar />
          <main className="px-6 py-6 xl:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
