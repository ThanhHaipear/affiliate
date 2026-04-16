import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getSellerProducts } from "../../../api/productApi";
import { getSellerOrders, getSellerProfile, getSellerStats } from "../../../api/sellerApi";
import { getWalletSummary } from "../../../api/walletApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import PageHeader from "../../../components/common/PageHeader";
import StatCard from "../../../components/common/StatCard";
import StatusBadge from "../../../components/common/StatusBadge";
import { mapProductDto, mapWalletDto } from "../../../lib/apiMappers";
import { formatCompactCurrency, formatCurrency, formatDateTime } from "../../../lib/format";

function CompactOverviewValue({ value }) {
  return <span title={formatCurrency(value)}>{formatCompactCurrency(value)}</span>;
}

function SellerOverviewPage() {
  const skipRemote = import.meta.env.MODE === "test";
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(!skipRemote);
  const [error, setError] = useState("");

  useEffect(() => {
    if (skipRemote) return undefined;
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");
        const [profileResponse, ordersResponse, productsResponse, walletResponse, statsResponse] = await Promise.all([
          getSellerProfile(),
          getSellerOrders(),
          getSellerProducts(),
          getWalletSummary(),
          getSellerStats(),
        ]);
        if (!active) return;
        setProfile(profileResponse || null);
        setOrders(ordersResponse || []);
        setProducts((productsResponse || []).map(mapProductDto));
        setWallet(mapWalletDto((walletResponse || []).find((item) => item.ownerType === "SELLER") || (walletResponse || [])[0] || {}));
        setStats(statsResponse || null);
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c dashboard seller.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [skipRemote]);

  const summary = useMemo(() => {
    const derivedProducts = new Set();
    let revenue = 0;
    let affiliateOrders = 0;
    let successfulOrders = 0;

    orders.forEach((order) => {
      if (order.status !== "CANCELLED" && order.status !== "REFUNDED") {
        revenue += Number(order.totalAmount || 0);
      }
      if (order.status === "COMPLETED") successfulOrders += 1;
      if ((order.items || []).some((item) => item.affiliateId)) affiliateOrders += 1;
      (order.items || []).forEach((item) => {
        derivedProducts.add(item.productId);
      });
    });

    return {
      soldProducts: derivedProducts.size,
      listedProducts: products.length,
      totalOrders: orders.length,
      affiliateOrders,
      revenue,
      payoutCommission: Number(stats?.amounts?.pendingCommission || 0),
      pendingMoneyConfirm: Number(stats?.counts?.pendingSettlementOrders || 0),
      successRate: orders.length ? Math.round((successfulOrders / orders.length) * 100) : 0,
    };
  }, [orders, products, stats]);

  const recentOrders = useMemo(() => (orders || []).slice(0, 5), [orders]);

  if (loading) {
    return <EmptyState title={"\u0110ang t\u1ea3i dashboard seller"} description={"H\u1ec7 th\u1ed1ng \u0111ang t\u1ed5ng h\u1ee3p d\u1eef li\u1ec7u seller t\u1eeb backend."} />;
  }

  if (error) {
    return <EmptyState title={"Kh\u00f4ng t\u1ea3i \u0111\u01b0\u1ee3c d\u1eef li\u1ec7u seller"} description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title={"T\u1ed5ng quan seller"}
        description={profile?.shopName
          ? `T\u1ed5ng quan v\u1eadn h\u00e0nh shop ${profile.shopName}: KPI, \u0111\u01a1n affiliate, doanh thu, hoa h\u1ed3ng v\u00e0 c\u00e1c vi\u1ec7c c\u1ea7n x\u1eed l\u00fd trong ng\u00e0y.`
          : "T\u1ed5ng quan v\u1eadn h\u00e0nh shop: KPI, \u0111\u01a1n affiliate, doanh thu, hoa h\u1ed3ng v\u00e0 c\u00e1c vi\u1ec7c c\u1ea7n x\u1eed l\u00fd trong ng\u00e0y."}
        action={<div className="flex flex-wrap gap-3"><Link to="/dashboard/seller/products/create"><Button>{"Th\u00eam s\u1ea3n ph\u1ea9m"}</Button></Link><Link to="/dashboard/seller/orders"><Button variant="secondary">{"Xem \u0111\u01a1n h\u00e0ng"}</Button></Link></div>}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={"S\u1ea3n ph\u1ea9m \u0111\u00e3 ph\u00e1t sinh \u0111\u01a1n"} value={summary.soldProducts} hint={"Suy ra t\u1eeb d\u1eef li\u1ec7u \u0111\u01a1n h\u00e0ng th\u1eadt"} tone="cyan" strong />
        <StatCard label={"S\u1ea3n ph\u1ea9m tr\u00ean h\u1ec7 th\u1ed1ng"} value={summary.listedProducts} hint={"L\u1ea5y tr\u1ef1c ti\u1ebfp t\u1eeb seller products API"} tone="amber" strong />
        <StatCard label={"T\u1ed5ng \u0111\u01a1n h\u00e0ng"} value={summary.totalOrders} tone="emerald" strong />
        <StatCard label={"\u0110\u01a1n t\u1eeb affiliate"} value={summary.affiliateOrders} tone="rose" strong />
        <StatCard label="Doanh thu" value={<CompactOverviewValue value={summary.revenue} />} tone="emerald" strong />
        <StatCard label={"Hoa h\u1ed3ng ph\u1ea3i tr\u1ea3"} value={<CompactOverviewValue value={summary.payoutCommission} />} tone="amber" strong />
        <StatCard label={"Ch\u1edd x\u00e1c nh\u1eadn ti\u1ec1n"} value={summary.pendingMoneyConfirm} tone="rose" strong />
        <StatCard label={"T\u1ef7 l\u1ec7 th\u00e0nh c\u00f4ng"} value={`${summary.successRate}%`} tone="cyan" strong />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel title={"Thao t\u00e1c nhanh"} description={"Nh\u1eefng thao t\u00e1c seller d\u00f9ng th\u01b0\u1eddng xuy\u00ean trong khu v\u1eadn h\u00e0nh."}>
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickLink to="/dashboard/seller/products/create" title={"Thêm sản phẩm"} description={"Tạo sản phẩm mới và cấu hình commission ngay trong form."} />
            <QuickLink to="/dashboard/seller/revenue" title={"Xem doanh thu"} description={"Theo dõi gross, commission, net và top sản phẩm."} />
            <QuickLink to="/dashboard/seller/withdrawals" title={"Ví và rút tiền"} description={"Theo dõi số dư, lịch sử payout và tạo yêu cầu rút tiền trên cùng một màn hình."} />
            <QuickLink to="/dashboard/seller/shop" title={"Cấu hình shop"} description={"Cập nhật thông tin shop, pháp lý và tài khoản nhận tiền mặc định."} />
          </div>
        </Panel>
        <Panel title={"Nh\u1eafc vi\u1ec7c v\u1eadn h\u00e0nh"} description={"Seller c\u1ea7n x\u1eed l\u00fd \u0111\u1ec3 hoa h\u1ed3ng \u0111\u01b0\u1ee3c ghi nh\u1eadn \u0111\u00fang logic."}>
          <div className="space-y-3">
            <ReminderItem title={`${summary.listedProducts} s\u1ea3n ph\u1ea9m \u0111ang thu\u1ed9c shop`} detail={"Danh s\u00e1ch s\u1ea3n ph\u1ea9m \u0111\u00e3 \u0111\u01b0\u1ee3c \u0111\u1ed3ng b\u1ed9 t\u1eeb seller products API thay v\u00ec d\u1eef li\u1ec7u gi\u1ea3."} />
            <ReminderItem title={`${summary.pendingMoneyConfirm} \u0111\u01a1n c\u1ea7n x\u00e1c nh\u1eadn nh\u1eadn ti\u1ec1n`} detail={"Ch\u1ec9 sau b\u01b0\u1edbc n\u00e0y hoa h\u1ed3ng affiliate v\u00e0 ph\u00ed n\u1ec1n t\u1ea3ng m\u1edbi \u0111\u01b0\u1ee3c ghi nh\u1eadn."} />
            <ReminderItem title={`S\u1ed1 d\u01b0 hi\u1ec7n t\u1ea1i ${formatCurrency(wallet?.balance || 0)}`} detail={"Theo d\u00f5i v\u00ed v\u00e0 l\u00ean l\u1ecbch r\u00fat ti\u1ec1n ho\u1eb7c \u0111\u1ed1i so\u00e1t."} />
          </div>
        </Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title={"\u0110\u01a1n h\u00e0ng g\u1ea7n \u0111\u00e2y"} description={"L\u1ea5y d\u1eef li\u1ec7u th\u1eadt t\u1eeb backend orders c\u1ee7a seller."}>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{order.orderCode}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {(order.items || [])[0]?.productNameSnapshot || "S\u1ea3n ph\u1ea9m trong \u0111\u01a1n"} | {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <StatusBadge status={order.status} />
                    <StatusBadge status={order.sellerConfirmedReceivedMoney ? "APPROVED" : "PENDING"} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title={"S\u1ea3n ph\u1ea9m n\u1ed5i b\u1eadt"} description={"Khu v\u1ef1c n\u00e0y \u0111ang d\u00f9ng seller products API \u0111\u1ec3 \u0111\u1ed1i chi\u1ebfu v\u1edbi \u0111\u01a1n h\u00e0ng."}>
          {products.length ? (
            <div className="space-y-3">
              {products.slice(0, 4).map((product) => (
                <div key={product.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{formatCurrency(product.price || 0)} | {product.approval_status}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title={"Ch\u01b0a c\u00f3 d\u1eef li\u1ec7u s\u1ea3n ph\u1ea9m c\u1ee7a seller"} description={"Shop n\u00e0y ch\u01b0a c\u00f3 s\u1ea3n ph\u1ea9m n\u00e0o trong database."} />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, description, children }) {
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-semibold text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-600">{description}</p><div className="mt-5">{children}</div></div>;
}

function QuickLink({ to, title, description }) {
  return <Link to={to} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50"><p className="font-semibold text-slate-900">{title}</p><p className="mt-2 text-sm leading-7 text-slate-600">{description}</p></Link>;
}

function ReminderItem({ title, detail }) {
  return <div className="rounded-[1.5rem] bg-slate-50 p-4"><p className="font-medium text-slate-900">{title}</p><p className="mt-2 text-sm leading-7 text-slate-600">{detail}</p></div>;
}

export default SellerOverviewPage;

