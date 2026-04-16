import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { getCustomerOrders } from "../../../api/orderApi";
import { getCurrentUserProfile, updateCurrentUserProfile } from "../../../api/userApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import Input from "../../../components/common/Input";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import StatusBadge from "../../../components/common/StatusBadge";
import { useToast } from "../../../hooks/useToast";
import { formatDateTime } from "../../../lib/format";
import { mapOrderDto } from "../../../lib/apiMappers";
import { customerProfileSchema } from "../../../schemas/profileSchemas";
import { useAuthStore } from "../../../store/authStore";

const DELIVERED_ORDER_STATUSES = ["COMPLETED"];
const FAILED_ORDER_STATUSES = ["REFUNDED", "CANCELLED"];

function isDeliveredOrder(order) {
  return DELIVERED_ORDER_STATUSES.includes(order.order_status);
}

function isFailedOrder(order) {
  return FAILED_ORDER_STATUSES.includes(order.order_status);
}

function isProcessingOrder(order) {
  return !isDeliveredOrder(order) && !isFailedOrder(order);
}

function CustomerProfilePage() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const setUser = useAuthStore((state) => state.setUser);
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: {
      fullName: currentUser?.profile?.fullName || "",
      phone: currentUser?.phone || "",
    },
  });

  useEffect(() => {
    reset({
      fullName: currentUser?.profile?.fullName || "",
      phone: currentUser?.phone || "",
    });
  }, [currentUser, reset]);

  useEffect(() => {
    let active = true;

    const mergeUserIntoSession = (nextUser) => {
      const baseUser = useAuthStore.getState().currentUser || {};

      setUser({
        ...baseUser,
        ...nextUser,
        roles: nextUser?.roles?.length ? nextUser.roles : baseUser.roles || [],
        profile: {
          ...(baseUser.profile || {}),
          ...(nextUser?.profile || {}),
        },
      });
    };

    async function loadProfilePage() {
      setLoading(true);
      setError("");

      const [ordersResult, profileResult] = await Promise.allSettled([
        getCustomerOrders(),
        getCurrentUserProfile(),
      ]);

      if (!active) {
        return;
      }

      if (ordersResult.status === "fulfilled") {
        setOrders((ordersResult.value || []).map(mapOrderDto));
      } else {
        setOrders([]);
      }

      if (profileResult.status === "fulfilled") {
        mergeUserIntoSession(profileResult.value);
      } else {
        setError(profileResult.reason?.response?.data?.message || "Không tải được hồ sơ khách hàng.");
      }

      setLoading(false);
    }

    loadProfilePage();

    return () => {
      active = false;
    };
  }, [setUser]);

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.amount || 0), 0),
    [orders],
  );
  const orderSummary = useMemo(() => {
    const deliveredOrders = orders.filter(isDeliveredOrder).length;
    const processingOrders = orders.filter(isProcessingOrder).length;
    const failedOrders = orders.filter(isFailedOrder).length;

    return {
      totalOrders: deliveredOrders + processingOrders + failedOrders,
      deliveredOrders,
      processingOrders,
      failedOrders,
    };
  }, [orders]);
  const recentOrders = useMemo(() => orders.slice(0, 4), [orders]);

  const onSubmit = async (values) => {
    try {
      const updatedUser = await updateCurrentUserProfile(values);
      setUser({
        ...(useAuthStore.getState().currentUser || {}),
        ...updatedUser,
        roles: updatedUser?.roles?.length ? updatedUser.roles : useAuthStore.getState().currentUser?.roles || [],
        profile: {
          ...(useAuthStore.getState().currentUser?.profile || {}),
          ...(updatedUser?.profile || {}),
        },
      });
      toast.success("Đã cập nhật hồ sơ customer.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được hồ sơ customer.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khách hàng"
        title={`Xin chào ${currentUser?.profile?.fullName || "khách hàng"}`}
        description="Tổng quan tài khoản, thống kê đơn mua, thao tác nhanh và đơn gần đây theo phong cách account area của ecommerce."
      />
      {loading ? <EmptyState title="Đang tải tổng quan" description="Hệ thống đang tổng hợp dữ liệu đơn hàng và thông tin tài khoản." /> : null}
      {!loading ? (
        <>
          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-sm">
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-700">Tổng quan tài khoản</p>
              <h3 className="mt-3 text-3xl font-semibold text-slate-900">
                Quản lý mua hàng và đơn hàng từ một khu vực thống nhất.
              </h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
                Customer chỉ thấy dữ liệu cần cho mua hàng và theo dõi trạng thái đơn. Không hiển thị dữ liệu nội bộ như commission hay vận hành hệ thống.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/cart">
                  <Button>Xem giỏ hàng</Button>
                </Link>
                <Link to="/products">
                  <Button variant="secondary">Tiếp tục mua sắm</Button>
                </Link>
                <Link to="/account/orders">
                  <Button variant="outline">Xem lịch sử đơn</Button>
                </Link>
              </div>
            </div>
            <ProfileCard
              title="Thông tin tài khoản"
              rows={[
                ["Họ tên", currentUser?.profile?.fullName || "--"],
                ["Email", currentUser?.email || "--"],
                ["Số điện thoại", currentUser?.phone || "--"],
                ["Vai trò", (currentUser?.roles || []).join(", ") || "--"],
              ]}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MiniCard label="Tổng đơn hàng" value={`${orderSummary.totalOrders}`} />
            <MiniCard label="Đơn đã hoàn tất" value={`${orderSummary.deliveredOrders}`} />
            <MiniCard label="Đơn đang xử lý" value={`${orderSummary.processingOrders}`} />
            <MiniCard label="Đơn hoàn tiền/hủy" value={`${orderSummary.failedOrders}`} />
            <MiniCard
              label="Tổng tiền đã mua"
              value={<MoneyText value={totalSpent} className="text-3xl font-semibold text-slate-900" />}
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Chỉnh sửa hồ sơ</h3>
                  <p className="mt-1 text-sm text-slate-500">Cập nhật họ tên và số điện thoại của bạn. Địa chỉ giao hàng được quản lý ở trang Địa chỉ.</p>
                </div>
                <Link to="/dashboard/customer/address">
                  <Button variant="secondary">Quản lý địa chỉ</Button>
                </Link>
              </div>
              <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
                <Input label="Họ tên" error={errors.fullName?.message} {...register("fullName")} />
                <Input label="Số điện thoại" error={errors.phone?.message} {...register("phone")} />
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" loading={isSubmitting}>Lưu thay đổi</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      reset({
                        fullName: currentUser?.profile?.fullName || "",
                        phone: currentUser?.phone || "",
                      })
                    }
                  >
                    Đặt lại
                  </Button>
                </div>
              </form>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900">Đơn hàng gần đây</h3>
                <Link to="/account/orders" className="text-sm font-medium text-cyan-700">
                  Xem tất cả
                </Link>
              </div>
              <div className="mt-5 space-y-3">
                {recentOrders.length ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{order.code}</p>
                          <p className="mt-1 text-sm text-slate-500">{formatDateTime(order.created_at)}</p>
                        </div>
                        <StatusBadge status={order.order_status} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-4">
                        <MoneyText value={order.amount} className="font-semibold text-slate-900" />
                        <Link to={`/dashboard/customer/orders/${order.id}`}>
                          <Button size="sm" variant="secondary">
                            Chi tiết
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="Chưa có đơn hàng" description="Khi đặt hàng, đơn gần đây sẽ hiện tại đây." />
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ProfileCard({ title, rows }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
      <div className="mt-5 space-y-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-[1.5rem] bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniCard({ label, value }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-700">{label}</p>
      {typeof value === "string" ? <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p> : <div className="mt-3">{value}</div>}
    </div>
  );
}

export default CustomerProfilePage;
