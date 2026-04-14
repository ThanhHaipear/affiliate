import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import { adminDashboardMock } from "../../../mock/dashboardMock";

function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title="Admin overview" description="Thống kê tổng quan hệ thống." />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Users" value={adminDashboardMock.total_users} tone="cyan" />
        <StatCard label="Sellers" value={adminDashboardMock.total_sellers} tone="emerald" />
        <StatCard label="Affiliates" value={adminDashboardMock.total_affiliates} tone="amber" />
        <StatCard label="GMV" value={<MoneyText value={adminDashboardMock.gross_merchandise_value} />} tone="rose" />
        <StatCard label="Platform Revenue" value={<MoneyText value={adminDashboardMock.platform_revenue} />} tone="emerald" />
      </div>
    </div>
  );
}

export default AdminOverviewPage;
