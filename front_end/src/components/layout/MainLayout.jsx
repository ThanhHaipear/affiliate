import { Outlet } from "react-router-dom";
import AnnouncementBar from "../storefront/AnnouncementBar";
import StorefrontFooter from "../storefront/StorefrontFooter";
import StorefrontHeader from "../storefront/StorefrontHeader";

function MainLayout() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_45%,#eef2f7_100%)]">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[22rem] bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_24%)]" />
      <div className="relative z-10">
        <AnnouncementBar />
        <StorefrontHeader />
        <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </div>
        <StorefrontFooter />
      </div>
    </div>
  );
}

export default MainLayout;
