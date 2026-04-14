import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getCart, removeCartItem, setCartItemQuantity } from "../../../api/orderApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { aggregateDisplayCartItems, mapCartDto } from "../../../lib/apiMappers";

function CartPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [selectedGroupKeys, setSelectedGroupKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [error, setError] = useState("");

  const groupedCartItems = useMemo(() => aggregateDisplayCartItems(cart.items), [cart.items]);

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    try {
      setLoading(true);
      setError("");
      const response = await getCart();
      const mappedCart = mapCartDto(response);
      const groups = aggregateDisplayCartItems(mappedCart.items);

      setCart(mappedCart);
      setSelectedGroupKeys((current) => {
        const validKeys = groups.map((item) => item.groupKey);
        const nextSelected = current.filter((groupKey) => validKeys.includes(groupKey));
        return nextSelected.length ? nextSelected : validKeys;
      });
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được giỏ hàng.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetQuantity(allocation, nextQuantity) {
    if (nextQuantity < 1) {
      return handleRemove(allocation);
    }

    try {
      setUpdatingItemId(allocation.id);
      await setCartItemQuantity(allocation.id, { quantity: nextQuantity });
      await loadCart();
      toast.success("Đã cập nhật giỏ hàng.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được giỏ hàng.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  async function handleRemove(allocation) {
    try {
      setUpdatingItemId(allocation.id);
      await removeCartItem(allocation.id);
      await loadCart();
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không xóa được sản phẩm khỏi giỏ hàng.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  function handleToggleGroup(groupKey) {
    setSelectedGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((value) => value !== groupKey)
        : [...current, groupKey],
    );
  }

  function handleToggleAll() {
    const allKeys = groupedCartItems.map((item) => item.groupKey);
    setSelectedGroupKeys((current) => (current.length === allKeys.length ? [] : allKeys));
  }

  function handleCheckout() {
    if (!selectedCartGroups.length) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
      return;
    }

    const selectedItemIds = selectedCartGroups.flatMap((group) => group.itemIds);
    const params = new URLSearchParams({ items: selectedItemIds.join(",") });
    navigate(`/dashboard/customer/checkout?${params.toString()}`);
  }

  const selectedCartGroups = useMemo(
    () => groupedCartItems.filter((item) => selectedGroupKeys.includes(item.groupKey)),
    [groupedCartItems, selectedGroupKeys],
  );

  const shippingFee = selectedCartGroups.length ? 30000 : 0;
  const selectedSubtotal = selectedCartGroups.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = selectedSubtotal + shippingFee;
  const allSelected = groupedCartItems.length > 0 && selectedGroupKeys.length === groupedCartItems.length;
  const selectedUnits = selectedCartGroups.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khách hàng"
        title="Giỏ hàng"
        description="Cùng một sản phẩm có thể vừa có phần mua trực tiếp vừa có phần đi qua affiliate. Giao diện gom thành một block để dễ nhìn, nhưng hệ thống vẫn giữ từng phần riêng để tính tiền chính xác."
      />
      {loading ? <EmptyState title="Đang tải giỏ hàng" description="Hệ thống đang lấy giỏ hàng từ database." /> : null}
      {!loading && error ? <EmptyState title="Không tải được giỏ hàng" description={error} /> : null}
      {!loading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Sản phẩm trong giỏ</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Nếu cùng sản phẩm có cả đơn trực tiếp và đơn qua affiliate, hệ thống gom thành một card nhưng vẫn giữ từng phần riêng để checkout đúng.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={handleToggleAll} disabled={!groupedCartItems.length}>
                    {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </Button>
                  <Link to="/products">
                    <Button variant="secondary">Tiếp tục mua sắm</Button>
                  </Link>
                </div>
              </div>
            </div>
            {groupedCartItems.length ? (
              groupedCartItems.map((group) => {
                const checked = selectedGroupKeys.includes(group.groupKey);
                return (
                  <div
                    key={group.groupKey}
                    className={`flex flex-col gap-4 rounded-[2rem] border bg-white p-5 shadow-sm ${checked ? "border-sky-300" : "border-slate-200"}`}
                  >
                    <div className="flex gap-4">
                      <label className="flex items-start pt-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleGroup(group.groupKey)}
                          className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                      </label>
                      <img src={group.product.image} alt={group.product.name} className="h-28 w-28 rounded-[1.5rem] object-cover" />
                      <div className="flex-1">
                        <p className="text-sm text-cyan-700">{group.product.seller_name}</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-900">{group.product.name}</h3>
                        <p className="mt-2 text-sm text-slate-500">Phân loại: {group.variant}</p>
                        <p className="mt-1 text-sm text-emerald-700">
                          Còn {Number(group.product.stock || 0).toLocaleString("vi-VN")} sản phẩm có thể mua ngoài giỏ
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                            Tổng số lượng: {Number(group.quantity || 0).toLocaleString("vi-VN")}
                          </span>
                          {group.hasAffiliateAttributed ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">Có phần đi qua affiliate</span>
                          ) : (
                            <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600">Toàn bộ là đơn trực tiếp</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col justify-between">
                        <MoneyText value={group.lineTotal} className="text-xl font-semibold text-slate-900" />
                        <span className="text-sm text-emerald-700">Đang giữ chỗ tồn kho cho sản phẩm này.</span>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Phân bổ trong cùng item</p>
                      <div className="mt-4 space-y-3">
                        {group.allocations.map((allocation) => (
                          <div key={allocation.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p className={`text-sm font-medium ${allocation.isAffiliateAttributed ? "text-emerald-700" : "text-slate-700"}`}>
                                  {allocation.label}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {allocation.isAffiliateAttributed
                                    ? "Chỉ phần này mới tính commission affiliate."
                                    : "Phần này không tính commission affiliate."}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                                  <button
                                    type="button"
                                    className="px-4 py-2 text-sm font-semibold text-slate-700"
                                    onClick={() => handleSetQuantity(allocation, allocation.quantity - 1)}
                                    disabled={updatingItemId === allocation.id}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={allocation.quantity}
                                    onChange={(event) => {
                                      const nextValue = Number(event.target.value);
                                      if (!Number.isFinite(nextValue) || nextValue < 1) {
                                        return;
                                      }
                                      handleSetQuantity(allocation, nextValue);
                                    }}
                                    className="w-16 border-x border-slate-200 bg-white px-2 py-2 text-center text-sm text-slate-900 outline-none"
                                  />
                                  <button
                                    type="button"
                                    className="px-4 py-2 text-sm font-semibold text-slate-700"
                                    onClick={() => handleSetQuantity(allocation, allocation.quantity + 1)}
                                    disabled={updatingItemId === allocation.id}
                                  >
                                    +
                                  </button>
                                </div>
                                <MoneyText value={allocation.lineTotal} className="font-semibold text-slate-900" />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  loading={updatingItemId === allocation.id}
                                  onClick={() => handleRemove(allocation)}
                                >
                                  Xóa phần này
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="Giỏ hàng trống" description="Chưa có sản phẩm nào trong giỏ hàng." />
            )}
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Tóm tắt đơn hàng</p>
            <div className="mt-4 rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              Mỗi block có thể chứa cả phần mua trực tiếp và phần đi qua affiliate, nhưng khi thanh toán hệ thống vẫn tách đúng từng phần để tính tiền.
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Block sản phẩm đã chọn</span>
                <span>{selectedCartGroups.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tổng số lượng</span>
                <span>{Number(selectedUnits || 0).toLocaleString("vi-VN")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tạm tính</span>
                <MoneyText value={selectedSubtotal} />
              </div>
              <div className="flex items-center justify-between">
                <span>Phí giao hàng</span>
                <MoneyText value={shippingFee} />
              </div>
              <div className="flex items-center justify-between">
                <span>Giảm giá</span>
                <span>0 VND</span>
              </div>
            </div>
            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-slate-900">Tổng cộng</span>
                <MoneyText value={total} className="text-2xl font-semibold text-slate-900" />
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <Link to="/products" className="block">
                <Button variant="secondary" className="w-full" size="lg">
                  Tiếp tục mua sắm
                </Button>
              </Link>
              <Button className="w-full" size="lg" disabled={!selectedCartGroups.length} onClick={handleCheckout}>
                Thanh toán sản phẩm đã chọn
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CartPage;
