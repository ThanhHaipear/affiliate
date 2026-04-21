import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCustomerAddresses } from "../../../api/customerAddressApi";
import { createCheckoutOrder, createVnpayPaymentUrl, getCart } from "../../../api/orderApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Select from "../../../components/common/Select";
import { useToast } from "../../../hooks/useToast";
import { buildCheckoutPayload } from "../../../lib/apiPayloads";
import { aggregateDisplayCartItems, mapCartDto, mapOrderDto } from "../../../lib/apiMappers";
import { SHIPPING_METHOD_OPTIONS } from "../../../lib/checkout";
import { useAuthStore } from "../../../store/authStore";

function CheckoutPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [searchParams] = useSearchParams();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    buyerEmail: currentUser?.email || "",
    shippingFee: 30000,
    discountAmount: 0,
    paymentMethod: "VNPAY",
    shippingMethod: "EXPRESS",
  });

  const selectedItemIds = useMemo(
    () =>
      (searchParams.get("items") || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [searchParams],
  );

  useEffect(() => {
    loadCheckoutData();
  }, []);

  async function loadCheckoutData() {
    try {
      setLoading(true);
      setError("");
      const [cartResponse, addressResponse] = await Promise.all([getCart(), getCustomerAddresses()]);
      const mappedCart = mapCartDto(cartResponse);
      const nextAddresses = addressResponse || [];
      const defaultAddress = nextAddresses.find((item) => item.isDefault) || nextAddresses[0];

      setCart(mappedCart);
      setAddresses(nextAddresses);
      setSelectedAddressId(defaultAddress ? String(defaultAddress.id) : "");
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được dữ liệu thanh toán.");
    } finally {
      setLoading(false);
    }
  }

  const selectedAddress = useMemo(
    () => addresses.find((item) => String(item.id) === String(selectedAddressId)) || null,
    [addresses, selectedAddressId],
  );

  const checkoutItems = useMemo(() => {
    if (!selectedItemIds.length) {
      return cart.items;
    }

    return cart.items.filter((item) => selectedItemIds.includes(String(item.id)));
  }, [cart.items, selectedItemIds]);

  const groupedCheckoutItems = useMemo(() => aggregateDisplayCartItems(checkoutItems), [checkoutItems]);

  const shopCount = useMemo(
    () => new Set(checkoutItems.map((item) => String(item.product?.seller_id || item.product?.seller_name || ""))).size,
    [checkoutItems],
  );

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + (item.product.salePrice || item.product.price) * item.quantity, 0),
    [checkoutItems],
  );

  const shippingTotal = useMemo(
    () => Number(form.shippingFee || 0) * Math.max(1, shopCount || 0),
    [form.shippingFee, shopCount],
  );

  const multiShopCheckout = shopCount > 1;

  const total = useMemo(
    () => subtotal + shippingTotal - Number(form.discountAmount || 0),
    [subtotal, form.discountAmount, shippingTotal],
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleSelectAddress(addressId) {
    setSelectedAddressId(String(addressId));
  }

  async function handleSubmit() {
    if (!selectedAddress) {
      toast.error("Vui lòng chọn địa chỉ giao hàng trước khi đặt đơn.");
      return;
    }

    if (!checkoutItems.length) {
      toast.error("Không có sản phẩm nào được chọn để thanh toán.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await createCheckoutOrder(
        buildCheckoutPayload({
          ...form,
          addressId: selectedAddress.id,
          selectedItemIds: checkoutItems.map((item) => item.id),
          buyerName: selectedAddress.recipientName,
          buyerPhone: selectedAddress.phone,
        }),
      );
      const createdOrders = (response?.orders || []).map(mapOrderDto);
      const primaryOrder = createdOrders[0] || null;

      if (["VNPAY", "CARD"].includes(form.paymentMethod) && primaryOrder) {
        const vnpay = await createVnpayPaymentUrl(primaryOrder.id, {});
        window.location.href = vnpay.paymentUrl;
        return;
      }

      toast.success(createdOrders.length > 1 ? "Đã tạo đơn hàng cho từng shop." : "Đã tạo đơn hàng từ giỏ hàng.");
      if (primaryOrder) {
        navigate(`/dashboard/customer/orders/${primaryOrder.id}`);
      } else {
        navigate("/dashboard/customer/orders");
      }
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || submitError.message || "Không tạo được đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Khách hàng" title="Thanh toán" />

      {loading ? <EmptyState title="Đang tải giỏ hàng" description="Hệ thống đang chuẩn bị dữ liệu thanh toán." /> : null}
      {!loading && error ? <EmptyState title="Không thể thanh toán" description={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <StepSection
              index="01"
              title="Chọn địa chỉ giao hàng"
              description="Bạn có thể chọn một trong các địa chỉ đã lưu. Địa chỉ đang chọn sẽ được dùng cho đơn hàng này."
            >
              {addresses.length ? (
                <div className="grid gap-4">
                  {addresses.map((address) => {
                    const active = String(address.id) === String(selectedAddressId);

                    return (
                      <div
                        key={address.id}
                        className={`rounded-[1.5rem] border p-4 transition ${
                          active ? "border-sky-500 bg-sky-50 shadow-sm" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="radio"
                            name="shipping-address"
                            checked={active}
                            onChange={() => handleSelectAddress(address.id)}
                            className="mt-1 h-5 w-5 border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-semibold text-slate-900">{address.recipientName}</p>
                                <p className="mt-1 text-sm text-slate-600">{address.phone}</p>
                                <p className="mt-2 text-sm leading-7 text-slate-600">
                                  {address.detail}, {address.ward}, {address.district}, {address.province}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {address.isDefault ? (
                                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                                    Mặc định
                                  </span>
                                ) : null}
                                {active ? (
                                  <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">
                                    Đang chọn
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-4 flex gap-3">
                              <Button
                                size="sm"
                                variant={active ? "secondary" : "primary"}
                                onClick={() => handleSelectAddress(address.id)}
                              >
                                {active ? "Địa chỉ đang chọn" : "Chọn địa chỉ này"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title="Chưa có địa chỉ giao hàng"
                  description="Bạn cần thêm ít nhất một địa chỉ trước khi đặt đơn hàng."
                  action={<Button onClick={() => navigate("/dashboard/customer/address")}>Thêm địa chỉ ngay</Button>}
                />
              )}
            </StepSection>

            <StepSection index="02" title="Liên hệ và vận chuyển" description="Chọn phương thức giao hàng và thanh toán phù hợp.">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="Phương thức giao hàng"
                  name="shippingMethod"
                  value={form.shippingMethod}
                  onChange={handleChange}
                  options={SHIPPING_METHOD_OPTIONS}
                />
                <Select
                  label="Phương thức thanh toán"
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                  options={[
                    { label: "VNPAY", value: "VNPAY" },
                    { label: "Thanh toán khi nhận hàng", value: "COD" },
                  ]}
                />
              </div>

              {multiShopCheckout ? (
                <div className="mt-4 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900">
                  Đơn này đang gồm sản phẩm từ {shopCount} shop. Phí giao hàng sẽ được tính theo từng shop. Nếu bạn chọn
                  VNPAY, hệ thống sẽ thanh toán một lần cho toàn bộ nhóm đơn hàng cùng mã checkout.
                </div>
              ) : null}
            </StepSection>

            <StepSection
              index="03"
              title="Sản phẩm đã chọn"
              description="Chỉ các sản phẩm được chọn từ giỏ hàng mới xuất hiện trong đơn thanh toán này."
            >
              <div className="space-y-4">
                {groupedCheckoutItems.map((group) => {
                  const productImage = group.product.gallery?.[0] || group.product.image;

                  return (
                    <div key={group.groupKey} className="rounded-[1.5rem] bg-slate-50 p-4">
                      <div className="flex items-center gap-4">
                        <img src={productImage} alt={group.product.name} className="h-20 w-20 rounded-[1rem] object-cover" />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{group.product.name}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {group.variant} | Tổng x{group.quantity}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">Shop: {group.product.seller_name}</p>
                          <p className={`mt-1 text-sm ${group.hasAffiliateAttributed ? "text-emerald-700" : "text-slate-500"}`}>
                            {group.hasAffiliateAttributed
                              ? "Nhóm này có sản phẩm trực tiếp và/hoặc sản phẩm đi qua affiliate."
                              : "Nhóm này là đơn trực tiếp."}
                          </p>
                        </div>
                        <MoneyText value={group.lineTotal} />
                      </div>

                      <div className="mt-3 space-y-2">
                        {group.allocations.map((allocation) => (
                          <div
                            key={allocation.id}
                            className="flex items-center justify-between rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-sm"
                          >
                            <span className={allocation.isAffiliateAttributed ? "text-emerald-700" : "text-slate-600"}>
                              {allocation.label} | x{allocation.quantity}
                            </span>
                            <MoneyText value={allocation.lineTotal} />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </StepSection>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Đơn hàng</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              <MoneyText value={total} />
            </p>

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Số nhóm sản phẩm đã chọn</span>
                <span>{groupedCheckoutItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Tạm tính</span>
                <MoneyText value={subtotal} />
              </div>
              <div className="flex justify-between">
                <span>Số shop trong đơn</span>
                <span>{Math.max(1, shopCount || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Phí giao hàng</span>
                <MoneyText value={shippingTotal} />
              </div>
              <div className="flex justify-between">
                <span>Giảm giá</span>
                <MoneyText value={form.discountAmount} />
              </div>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              {selectedAddress ? (
                <>
                  <p className="font-semibold text-slate-900">{selectedAddress.recipientName}</p>
                  <p className="mt-1">{selectedAddress.phone}</p>
                  <p className="mt-2">
                    {selectedAddress.detail}, {selectedAddress.ward}, {selectedAddress.district}, {selectedAddress.province}
                  </p>
                </>
              ) : (
                "Chưa chọn địa chỉ giao hàng."
              )}
            </div>

            <Button
              className="mt-6 w-full"
              size="lg"
              loading={submitting}
              disabled={!checkoutItems.length || !selectedAddress}
              onClick={handleSubmit}
            >
              {form.paymentMethod === "VNPAY" ? "Sang VNPAY để thanh toán" : "Xác nhận đặt hàng"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StepSection({ index, title, description, children }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
          {index}
        </span>
        <div>
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default CheckoutPage;
