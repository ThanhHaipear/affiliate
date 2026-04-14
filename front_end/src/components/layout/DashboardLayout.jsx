import { Outlet } from "react-router-dom";
import AnnouncementBar from "../storefront/AnnouncementBar";
import StorefrontHeader from "../storefront/StorefrontHeader";
import Header from "./Header";
import Sidebar from "./Sidebar";

function DashboardLayout() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_30%,#eef4f9_100%)]">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[22rem] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="relative z-10">
        <AnnouncementBar />
        <StorefrontHeader />
        <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[300px_1fr] lg:px-8">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <Sidebar />
          </div>
          <div className="space-y-6">
            <Header />
            <main>
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
