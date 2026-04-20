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
import { formatCompactCurrency, formatCurrency, formatDateTime, formatStatusLabel } from "../../../lib/format";

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
    if (skipRemote) {
      return undefined;
    }

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

        if (!active) {
          return;
        }

        setProfile(profileResponse || null);
        setOrders(ordersResponse || []);
        setProducts((productsResponse || []).map(mapProductDto));
        setWallet(
          mapWalletDto(
            (walletResponse || []).find((item) => item.ownerType === "SELLER") ||
            (walletResponse || [])[0] ||
            {},
          ),
        );
        setStats(statsResponse || null);
      } catch (loadError) {
        if (active) {
          setError(loadError.response?.data?.message || "Không tải được trang tổng quan seller.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
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

      if (order.status === "COMPLETED") {
        successfulOrders += 1;
      }

      if ((order.items || []).some((item) => item.affiliateId)) {
        affiliateOrders += 1;
      }

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

  const recentOrders = useMemo(() => (orders || []).slice(0, 3), [orders]);

  if (loading) {
    return (
      <EmptyState
        title="Đang tải trang tổng quan"
        description="Hệ thống đang tổng hợp dữ liệu vận hành của seller từ backend."
      />
    );
  }

  if (error) {
    return <EmptyState title="Không tải được dữ liệu seller" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Seller"
        title="Tổng quan"

        action={
          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard/seller/products/create">
              <Button>Thêm sản phẩm</Button>
            </Link>
            <Link to="/dashboard/seller/orders">
              <Button variant="secondary">Xem đơn hàng</Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sản phẩm đã phát sinh đơn"
          value={summary.soldProducts}

          tone="cyan"
          strong
        />
        <StatCard
          label="Sản phẩm trên hệ thống"
          value={summary.listedProducts}

          tone="amber"
          strong
        />
        <StatCard label="Tổng đơn hàng" value={summary.totalOrders} tone="emerald" strong />
        <StatCard label="Đơn từ affiliate" value={summary.affiliateOrders} tone="rose" strong />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel
          title="Thao tác nhanh"
          description="Những thao tác seller dùng thường xuyên trong khu vận hành."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickLink
              to="/dashboard/seller/products/create"
              title="Thêm sản phẩm"
              description="Tạo sản phẩm mới và cấu hình commission ngay trong form."
            />
            <QuickLink
              to="/dashboard/seller/revenue"
              title="Xem doanh thu"
              description="Theo dõi gross, commission, net và top sản phẩm."
            />
            <QuickLink
              to="/dashboard/seller/withdrawals"
              title="Ví và rút tiền"
              description="Theo dõi số dư, lịch sử payout và tạo yêu cầu rút tiền trên cùng một màn hình."
            />
            <QuickLink
              to="/dashboard/seller/shop"
              title="Quản lý shop"
              description="Cập nhật thông tin shop, pháp lý và tài khoản nhận tiền mặc định."
            />
          </div>
        </Panel>

        <Panel
          title="Nhắc việc vận hành"
          description="Các việc seller cần xử lý để dòng tiền và đối soát được ghi nhận đúng."
        >
          <div className="space-y-3">
            <ReminderItem
              title={`${summary.listedProducts} sản phẩm đang thuộc shop`}
              detail="Danh sách sản phẩm đang được đồng bộ trực tiếp từ seller products API."
            />
            <ReminderItem
              title={`${summary.pendingMoneyConfirm} đơn cần xác nhận nhận tiền`}
              detail="Chỉ sau bước này hoa hồng affiliate và phí nền tảng mới được ghi nhận."
            />
            <ReminderItem
              title={`Số dư ví hiện tại ${formatCurrency(wallet?.balance || 0)}`}
              detail="Theo dõi ví và lên lịch rút tiền hoặc đối soát khi cần."
            />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel title="Đơn hàng gần đây" >
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{order.orderCode}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {(order.items || [])[0]?.productNameSnapshot || "Sản phẩm trong đơn"} |{" "}
                      {formatDateTime(order.createdAt)}
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

        <Panel
          title="Sản phẩm nổi bật"

        >
          {products.length ? (
            <div className="space-y-3">
              {products.slice(0, 3).map((product) => (
                <div key={product.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatCurrency(product.price || 0)} | {formatStatusLabel(product.approval_status)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có dữ liệu sản phẩm"
              description="Shop này hiện chưa có sản phẩm nào trong hệ thống."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, description, children }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function QuickLink({ to, title, description }) {
  return (
    <Link
      to={to}
      className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-200 hover:bg-sky-50"
    >
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </Link>
  );
}

function ReminderItem({ title, detail }) {
  return (
    <div className="rounded-[1.5rem] bg-slate-50 p-4">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{detail}</p>
    </div>
  );
}

export default SellerOverviewPage;
