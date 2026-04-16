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
  const [quantityDrafts, setQuantityDrafts] = useState({});

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
      setQuantityDrafts(() => {
        const next = {};
        groups.forEach((group) => {
          group.allocations.forEach((allocation) => {
            next[allocation.id] = String(allocation.quantity);
          });
        });
        return next;
      });
      setSelectedGroupKeys((current) => {
        const validKeys = groups.map((item) => item.groupKey);
        const nextSelected = current.filter((groupKey) => validKeys.includes(groupKey));
        return nextSelected.length ? nextSelected : validKeys;
      });
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Khong tai duoc gio hang.");
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
      toast.success("Da cap nhat gio hang.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc gio hang.");
    } finally {
      setUpdatingItemId(null);
    }
  }

  function handleDraftQuantityChange(allocation, rawValue) {
    const nextValue = String(rawValue ?? "");
    if (nextValue !== "" && !/^\d+$/.test(nextValue)) {
      return;
    }

    setQuantityDrafts((current) => ({
      ...current,
      [allocation.id]: nextValue,
    }));
  }

  async function handleDraftQuantityBlur(allocation) {
    const rawValue = quantityDrafts[allocation.id];
    const nextQuantity = Math.max(1, Number.parseInt(rawValue, 10) || 1);

    setQuantityDrafts((current) => ({
      ...current,
      [allocation.id]: String(nextQuantity),
    }));

    if (nextQuantity !== allocation.quantity) {
      await handleSetQuantity(allocation, nextQuantity);
    }
  }

  async function handleRemove(allocation) {
    try {
      setUpdatingItemId(allocation.id);
      await removeCartItem(allocation.id);
      await loadCart();
      toast.success("Da xoa san pham khoi gio hang.");
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong xoa duoc san pham khoi gio hang.");
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

  const selectedCartGroups = useMemo(
    () => groupedCartItems.filter((item) => selectedGroupKeys.includes(item.groupKey)),
    [groupedCartItems, selectedGroupKeys],
  );

  const hasSelectedStockConflict = selectedCartGroups.some((item) => item.hasStockConflict);

  function handleCheckout() {
    if (!selectedCartGroups.length) {
      toast.error("Vui long chon it nhat mot san pham de thanh toan.");
      return;
    }

    if (hasSelectedStockConflict) {
      toast.error("Co san pham vuot qua ton kho hien tai. Vui long dieu chinh so luong.");
      return;
    }

    const selectedItemIds = selectedCartGroups.flatMap((group) => group.itemIds);
    const params = new URLSearchParams({ items: selectedItemIds.join(",") });
    navigate(`/dashboard/customer/checkout?${params.toString()}`);
  }

  const shippingFee = selectedCartGroups.length ? 30000 : 0;
  const selectedSubtotal = selectedCartGroups.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = selectedSubtotal + shippingFee;
  const allSelected = groupedCartItems.length > 0 && selectedGroupKeys.length === groupedCartItems.length;
  const selectedUnits = selectedCartGroups.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khach hang"
        title="Gio hang"
        description="San pham trong gio hang khong tru ton ngay. Ton kho chi giam khi ban tao don hang thanh cong."
      />

      {loading ? <EmptyState title="Dang tai gio hang" description="He thong dang lay du lieu gio hang." /> : null}
      {!loading && error ? <EmptyState title="Khong tai duoc gio hang" description={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">San pham trong gio</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Nguoi dung khac van co the them cung san pham vao gio. He thong se kiem tra ton kho
                    thuc te khi ban checkout.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={handleToggleAll} disabled={!groupedCartItems.length}>
                    {allSelected ? "Bo chon tat ca" : "Chon tat ca"}
                  </Button>
                  <Link to="/products">
                    <Button variant="secondary">Tiep tuc mua sam</Button>
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

                      <img
                        src={group.product.image}
                        alt={group.product.name}
                        className="h-28 w-28 rounded-[1.5rem] object-cover"
                      />

                      <div className="flex-1">
                        <p className="text-sm text-cyan-700">{group.product.seller_name}</p>
                        <h3 className="mt-1 text-xl font-semibold text-slate-900">{group.product.name}</h3>
                        <p className="mt-2 text-sm text-slate-500">Phan loai: {group.variant}</p>
                        <p className="mt-1 text-sm text-emerald-700">
                          Ton kho hien tai con {Number(group.currentAvailableStock || 0).toLocaleString("vi-VN")} san
                          pham co the dat hang
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3 text-sm">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                            Tong so luong trong gio: {Number(group.quantity || 0).toLocaleString("vi-VN")}
                          </span>
                          {group.hasAffiliateAttributed ? (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                              Co phan di qua affiliate
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-600">
                              Toan bo la don truc tiep
                            </span>
                          )}
                        </div>

                        {group.hasStockConflict ? (
                          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
                            So luong ton con {Number(group.currentAvailableStock || 0).toLocaleString("vi-VN")} san
                            pham, vui long dieu chinh so luong.
                          </p>
                        ) : (
                          <p className="mt-3 text-sm text-slate-500">
                            San pham nay se duoc giu cho khi ban tao don hang.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col justify-between">
                        <MoneyText value={group.lineTotal} className="text-xl font-semibold text-slate-900" />
                        <span className={`text-sm ${group.hasStockConflict ? "text-amber-700" : "text-emerald-700"}`}>
                          {group.hasStockConflict ? "Can dieu chinh truoc khi checkout" : "San sang thanh toan"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Phan bo trong cung item</p>
                      <div className="mt-4 space-y-3">
                        {group.allocations.map((allocation) => (
                          <div key={allocation.id} className="rounded-[1.25rem] border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p
                                  className={`text-sm font-medium ${allocation.isAffiliateAttributed ? "text-emerald-700" : "text-slate-700"}`}
                                >
                                  {allocation.label}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {allocation.isAffiliateAttributed
                                    ? "Chi phan nay moi tinh commission affiliate."
                                    : "Phan nay khong tinh commission affiliate."}
                                </p>
                                {allocation.hasStockConflict ? (
                                  <p className="mt-2 text-sm font-medium text-amber-700">
                                    Ton hien tai con {Number(allocation.currentAvailableStock || 0).toLocaleString("vi-VN")} san
                                    pham.
                                  </p>
                                ) : null}
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
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min="1"
                                    value={quantityDrafts[allocation.id] ?? String(allocation.quantity)}
                                    onChange={(event) => handleDraftQuantityChange(allocation, event.target.value)}
                                    onBlur={() => handleDraftQuantityBlur(allocation)}
                                    className="w-16 border-x border-slate-200 bg-white px-2 py-2 text-center text-sm text-slate-900 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
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
                                  Xoa phan nay
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
              <EmptyState title="Gio hang trong" description="Chua co san pham nao trong gio hang." />
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Tom tat don hang</p>
            <div className="mt-4 rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              Ton kho chi duoc khoa khi ban dat hang. Neu trong gio co san pham vuot ton hien tai, he thong se yeu
              cau dieu chinh truoc khi thanh toan.
            </div>

            {hasSelectedStockConflict ? (
              <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Co san pham trong lua chon dang vuot qua ton kho hien tai. Vui long giam so luong hoac bo chon san
                pham do.
              </div>
            ) : null}

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Block san pham da chon</span>
                <span>{selectedCartGroups.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tong so luong</span>
                <span>{Number(selectedUnits || 0).toLocaleString("vi-VN")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tam tinh</span>
                <MoneyText value={selectedSubtotal} />
              </div>
              <div className="flex items-center justify-between">
                <span>Phi giao hang</span>
                <MoneyText value={shippingFee} />
              </div>
              <div className="flex items-center justify-between">
                <span>Giam gia</span>
                <span>0 VND</span>
              </div>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-slate-900">Tong cong</span>
                <MoneyText value={total} className="text-2xl font-semibold text-slate-900" />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Link to="/products" className="block">
                <Button variant="secondary" className="w-full" size="lg">
                  Tiep tuc mua sam
                </Button>
              </Link>
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedCartGroups.length || hasSelectedStockConflict}
                onClick={handleCheckout}
              >
                Thanh toan san pham da chon
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CartPage;
