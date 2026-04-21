import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getCart, removeCartItem, setCartItemQuantity, updateCartItem } from "../../../api/orderApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Pagination from "../../../components/common/Pagination";
import { useToast } from "../../../hooks/useToast";
import { aggregateDisplayCartItems, mapCartDto, summarizeCartAttributions } from "../../../lib/apiMappers";

const CART_ITEMS_PER_PAGE = 3;

function CartPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [selectedGroupKeys, setSelectedGroupKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingGroupKey, setUpdatingGroupKey] = useState(null);
  const [error, setError] = useState("");
  const [quantityDrafts, setQuantityDrafts] = useState({});
  const [page, setPage] = useState(1);

  const groupedCartItems = useMemo(() => aggregateDisplayCartItems(cart.items), [cart.items]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(groupedCartItems.length / CART_ITEMS_PER_PAGE)),
    [groupedCartItems.length],
  );
  const paginatedCartItems = useMemo(() => {
    const start = (page - 1) * CART_ITEMS_PER_PAGE;
    return groupedCartItems.slice(start, start + CART_ITEMS_PER_PAGE);
  }, [groupedCartItems, page]);
  const selectableCartItems = useMemo(
    () => groupedCartItems.filter((item) => !item.isUnavailable),
    [groupedCartItems],
  );

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    const selectableKeys = groupedCartItems.filter((item) => !item.isUnavailable).map((item) => item.groupKey);
    setSelectedGroupKeys((current) => current.filter((groupKey) => selectableKeys.includes(groupKey)));
  }, [groupedCartItems]);

  async function loadCart() {
    try {
      setLoading(true);
      setError("");
      const response = await getCart();
      const mappedCart = mapCartDto(response);
      const groups = aggregateDisplayCartItems(mappedCart.items);

      setCart(mappedCart);
      setQuantityDrafts(() => {
        const next = {};
        groups.forEach((group) => {
          next[group.groupKey] = String(group.quantity);
        });
        return next;
      });
      setSelectedGroupKeys((current) => {
        const validKeys = groups.filter((item) => !item.isUnavailable).map((item) => item.groupKey);
        return current.filter((groupKey) => validKeys.includes(groupKey));
      });
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được giỏ hàng.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetGroupQuantity(group, nextQuantity) {
    if (group.isUnavailable) {
      toast.error("Sản phẩm này hiện không còn khả dụng để cập nhật số lượng.");
      return;
    }

    if (nextQuantity < 1) {
      return handleRemoveGroup(group);
    }

    const maxAllowedQuantity = Math.max(1, Number(group.currentAvailableStock || 0));
    if (nextQuantity > maxAllowedQuantity) {
      toast.error(`Chỉ còn ${Number(group.currentAvailableStock || 0).toLocaleString("vi-VN")} sản phẩm có thể đặt.`);
      setQuantityDrafts((current) => ({
        ...current,
        [group.groupKey]: String(group.quantity),
      }));
      return;
    }

    const currentQuantity = Number(group.quantity || 0);
    const quantityDelta = nextQuantity - currentQuantity;

    if (quantityDelta === 0) {
      return;
    }

    try {
      setUpdatingGroupKey(group.groupKey);

      if (quantityDelta > 0) {
        await updateCartItem({
          productId: Number(group.product.id),
          variantId: Number(group.variantId),
          quantity: quantityDelta,
        });
      } else {
        let remainingToReduce = Math.abs(quantityDelta);
        const reductionPlan = [...group.allocations].sort((left, right) => {
          if (left.isAffiliateAttributed !== right.isAffiliateAttributed) {
            return left.isAffiliateAttributed ? 1 : -1;
          }

          const leftTime = new Date(left.updatedAt || left.createdAt || 0).getTime();
          const rightTime = new Date(right.updatedAt || right.createdAt || 0).getTime();
          return rightTime - leftTime;
        });

        for (const allocation of reductionPlan) {
          if (remainingToReduce <= 0) {
            break;
          }

          const removableQuantity = Math.min(remainingToReduce, allocation.quantity);

          if (removableQuantity === allocation.quantity) {
            await removeCartItem(allocation.id);
          } else {
            await setCartItemQuantity(allocation.id, {
              quantity: allocation.quantity - removableQuantity,
            });
          }

          remainingToReduce -= removableQuantity;
        }
      }

      await loadCart();
      toast.success("Đã cập nhật giỏ hàng.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được giỏ hàng.");
    } finally {
      setUpdatingGroupKey(null);
    }
  }

  function handleGroupDraftQuantityChange(group, rawValue) {
    const nextValue = String(rawValue ?? "");
    if (nextValue !== "" && !/^\d+$/.test(nextValue)) {
      return;
    }

    setQuantityDrafts((current) => ({
      ...current,
      [group.groupKey]: nextValue,
    }));
  }

  async function handleGroupDraftQuantityBlur(group) {
    const rawValue = quantityDrafts[group.groupKey];
    const maxAllowedQuantity = Math.max(1, Number(group.currentAvailableStock || 0));
    const nextQuantity = Math.min(maxAllowedQuantity, Math.max(1, Number.parseInt(rawValue, 10) || 1));

    setQuantityDrafts((current) => ({
      ...current,
      [group.groupKey]: String(nextQuantity),
    }));

    if (nextQuantity !== group.quantity) {
      await handleSetGroupQuantity(group, nextQuantity);
    }
  }

  async function handleRemoveGroup(group) {
    try {
      setUpdatingGroupKey(group.groupKey);
      await Promise.all(group.allocations.map((allocation) => removeCartItem(allocation.id)));
      await loadCart();
      toast.success("Đã xóa sản phẩm khỏi giỏ hàng.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không xóa được sản phẩm khỏi giỏ hàng.");
    } finally {
      setUpdatingGroupKey(null);
    }
  }

  function handleToggleGroup(group) {
    if (group.isUnavailable) {
      return;
    }

    setSelectedGroupKeys((current) =>
      current.includes(group.groupKey)
        ? current.filter((value) => value !== group.groupKey)
        : [...current, group.groupKey],
    );
  }

  function handleToggleAll() {
    const selectableKeys = selectableCartItems.map((item) => item.groupKey);
    const allSelectableSelected =
      selectableKeys.length > 0 && selectableKeys.every((groupKey) => selectedGroupKeys.includes(groupKey));

    setSelectedGroupKeys((current) =>
      allSelectableSelected
        ? current.filter((groupKey) => !selectableKeys.includes(groupKey))
        : [...new Set([...current, ...selectableKeys])],
    );
  }

  const selectedCartGroups = useMemo(
    () => groupedCartItems.filter((item) => selectedGroupKeys.includes(item.groupKey)),
    [groupedCartItems, selectedGroupKeys],
  );

  const hasSelectedStockConflict = selectedCartGroups.some((item) => item.hasStockConflict);
  const selectedShopCount = useMemo(
    () =>
      new Set(
        selectedCartGroups.map((item) => String(item.product?.seller_id || item.product?.seller_name || item.groupKey)),
      ).size,
    [selectedCartGroups],
  );

  function handleCheckout() {
    if (!selectedCartGroups.length) {
      toast.error("Vui lòng chọn ít nhất một sản phẩm để thanh toán.");
      return;
    }

    if (hasSelectedStockConflict) {
      toast.error("Có sản phẩm vượt quá tồn kho hiện tại. Vui lòng điều chỉnh số lượng.");
      return;
    }

    const selectedItemIds = selectedCartGroups.flatMap((group) => group.itemIds);
    const params = new URLSearchParams({ items: selectedItemIds.join(",") });
    navigate(`/dashboard/customer/checkout?${params.toString()}`);
  }

  const shippingFee = selectedShopCount ? 30000 * selectedShopCount : 0;
  const selectedSubtotal = selectedCartGroups.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = selectedSubtotal + shippingFee;
  const allSelected =
    selectableCartItems.length > 0 &&
    selectableCartItems.every((item) => selectedGroupKeys.includes(item.groupKey));
  const selectedUnits = selectedCartGroups.reduce((sum, item) => sum + item.quantity, 0);

  function handlePageChange(nextPage) {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Khách hàng" title="Giỏ hàng" />

      {loading ? <EmptyState title="Đang tải giỏ hàng" description="Hệ thống đang lấy dữ liệu giỏ hàng." /> : null}
      {!loading && error ? <EmptyState title="Không tải được giỏ hàng" description={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Sản phẩm trong giỏ</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Sản phẩm hết hàng hoặc bị ẩn sẽ tự chuyển xuống cuối danh sách và không thể thanh toán.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={handleToggleAll}
                    disabled={!selectableCartItems.length}
                  >
                    {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </Button>
                  <Link to="/products">
                    <Button variant="secondary">Tiếp tục mua sắm</Button>
                  </Link>
                </div>
              </div>
            </div>

            {groupedCartItems.length ? (
              <>
                {paginatedCartItems.map((group) => {
                  const checked = selectedGroupKeys.includes(group.groupKey);
                  const attributionSummary = summarizeCartAttributions(group);
                  const productImage = group.product.gallery?.[0] || group.product.image;

                  return (
                    <div
                      key={group.groupKey}
                      className={`flex flex-col gap-3 rounded-[1.5rem] border bg-white p-4 shadow-sm transition ${
                        group.isUnavailable ? "border-slate-200 opacity-60 grayscale-[0.2]" : checked ? "border-sky-300" : "border-slate-200"
                      }`}
                    >
                      <div className="grid gap-3 lg:grid-cols-[auto_auto_minmax(0,1fr)_170px] lg:items-start">
                        <label className="flex items-start pt-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleGroup(group)}
                            disabled={group.isUnavailable}
                            className="h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </label>

                        <div className="shrink-0">
                          <Link
                            to={`/products/${group.product.slug || group.product.id}`}
                            className="block h-22 w-22 overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50 sm:h-24 sm:w-24"
                          >
                            <img
                              src={productImage}
                              alt={group.product.name}
                              className="h-full w-full object-cover transition duration-200 hover:scale-[1.03]"
                            />
                          </Link>
                          <p className="mt-2 w-22 text-center text-xs font-medium leading-5 text-emerald-700 sm:w-24">
                            Còn {Number(group.currentAvailableStock || 0).toLocaleString("vi-VN")} sản phẩm
                          </p>
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm text-cyan-700">
                            {group.product.seller_id ? (
                              <Link
                                to={`/shops/${group.product.seller_id}`}
                                className="transition hover:text-sky-800 hover:underline"
                              >
                                {group.product.seller_name}
                              </Link>
                            ) : (
                              group.product.seller_name
                            )}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold text-slate-900">{group.product.name}</h3>
                          <p className="mt-2 text-sm text-slate-500">Phân loại: {group.variant}</p>

                          <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            {group.hasAffiliateAttributed ? (
                              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                                Có phần đi qua affiliate
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600">
                                Toàn bộ là đơn trực tiếp
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {attributionSummary.map((entry) => (
                              <span
                                key={entry.key}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  entry.isAffiliateAttributed ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {entry.label}: x{Number(entry.quantity || 0).toLocaleString("vi-VN")}
                              </span>
                            ))}
                          </div>

                          {group.isUnavailable ? (
                            <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600">
                              Sản phẩm này hiện đã hết hàng hoặc đã bị ẩn. Bạn không thể chọn để thanh toán.
                            </p>
                          ) : group.hasStockConflict ? (
                            <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                              Số lượng tồn còn {Number(group.currentAvailableStock || 0).toLocaleString("vi-VN")} sản phẩm,
                              vui lòng điều chỉnh số lượng.
                            </p>
                          ) : null}
                        </div>

                        <div className="flex min-w-0 flex-col items-start justify-start rounded-[1.25rem] border border-slate-200 bg-slate-50/90 p-3 lg:items-end">
                          <MoneyText
                            value={group.lineTotal}
                            className="whitespace-nowrap text-2xl font-semibold leading-none text-slate-900"
                          />
                          <span
                            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                              group.isUnavailable
                                ? "bg-slate-100 text-slate-600"
                                : group.hasStockConflict
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {group.isUnavailable
                              ? "Không thể thanh toán"
                              : group.hasStockConflict
                                ? "Cần điều chỉnh trước khi checkout"
                                : "Sẵn sàng thanh toán"}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Điều chỉnh sản phẩm</p>
                        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
                              <button
                                type="button"
                                className="px-3 py-2 text-sm font-semibold text-slate-700"
                                onClick={() => handleSetGroupQuantity(group, group.quantity - 1)}
                                disabled={updatingGroupKey === group.groupKey || group.isUnavailable}
                              >
                                -
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="1"
                                value={quantityDrafts[group.groupKey] ?? String(group.quantity)}
                                onChange={(event) => handleGroupDraftQuantityChange(group, event.target.value)}
                                onBlur={() => handleGroupDraftQuantityBlur(group)}
                                disabled={group.isUnavailable}
                                className="w-14 border-x border-slate-200 bg-white px-2 py-2 text-center text-sm text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                className="px-3 py-2 text-sm font-semibold text-slate-700"
                                onClick={() => handleSetGroupQuantity(group, group.quantity + 1)}
                                disabled={
                                  updatingGroupKey === group.groupKey ||
                                  group.isUnavailable ||
                                  group.hasStockConflict ||
                                  Number(group.quantity || 0) >= Number(group.currentAvailableStock || 0)
                                }
                              >
                                +
                              </button>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              loading={updatingGroupKey === group.groupKey}
                              onClick={() => handleRemoveGroup(group)}
                            >
                              Xóa sản phẩm
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </>
            ) : (
              <EmptyState title="Giỏ hàng trống" description="Chưa có sản phẩm nào trong giỏ hàng." />
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Tóm tắt đơn hàng</p>
            <div className="mt-4 rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              Tồn kho chỉ được khóa khi bạn đặt hàng. Nếu trong giỏ có sản phẩm vượt tồn hiện tại, hệ thống sẽ yêu cầu
              điều chỉnh trước khi thanh toán.
            </div>

            {hasSelectedStockConflict ? (
              <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Có sản phẩm trong lựa chọn đang vượt quá tồn kho hiện tại. Vui lòng giảm số lượng hoặc bỏ chọn sản phẩm đó.
              </div>
            ) : null}

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Nhóm sản phẩm đã chọn</span>
                <span>{selectedCartGroups.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tổng số lượng</span>
                <span>{Number(selectedUnits || 0).toLocaleString("vi-VN")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Số shop đã chọn</span>
                <span>{selectedShopCount}</span>
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
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedCartGroups.length || hasSelectedStockConflict}
                onClick={handleCheckout}
              >
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
