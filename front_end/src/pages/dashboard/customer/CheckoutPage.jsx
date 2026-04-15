import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getCustomerAddresses } from "../../../api/customerAddressApi";
import { createCheckoutOrder, createVnpayPaymentUrl, getCart } from "../../../api/orderApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import Input from "../../../components/common/Input";
import MoneyText from "../../../components/common/MoneyText";
import PageHeader from "../../../components/common/PageHeader";
import Select from "../../../components/common/Select";
import { useToast } from "../../../hooks/useToast";
import { buildCheckoutPayload } from "../../../lib/apiPayloads";
import { aggregateDisplayCartItems, mapCartDto, mapOrderDto } from "../../../lib/apiMappers";
import { shippingMethods } from "../../../mock/customerData";
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
    () => (searchParams.get("items") || "").split(",").map((value) => value.trim()).filter(Boolean),
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
      setError(loadError.response?.data?.message || "Khong tai duoc du lieu checkout.");
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

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + (item.product.salePrice || item.product.price) * item.quantity, 0),
    [checkoutItems],
  );

  const total = useMemo(
    () => subtotal + Number(form.shippingFee || 0) - Number(form.discountAmount || 0),
    [subtotal, form.discountAmount, form.shippingFee],
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
      toast.error("Vui long chon dia chi giao hang truoc khi dat don.");
      return;
    }

    if (!checkoutItems.length) {
      toast.error("Khong co san pham nao duoc chon de thanh toan.");
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
      const order = mapOrderDto(response);

      if (["VNPAY", "CARD"].includes(form.paymentMethod)) {
        const vnpay = await createVnpayPaymentUrl(order.id, {});
        window.location.href = vnpay.paymentUrl;
        return;
      }

      toast.success("Da tao don hang tu gio hang.");
      navigate(`/dashboard/customer/orders/${order.id}`);
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong tao duoc don hang.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khach hang"
        title="Thanh toan"
        description="Chon dia chi giao hang, kiem tra san pham da chon va xac nhan phuong thuc thanh toan truoc khi dat don."
        action={
          <Button variant="secondary" onClick={() => navigate("/dashboard/customer/address")}>
            Quan ly dia chi
          </Button>
        }
      />
      {loading ? <EmptyState title="Dang tai gio hang" description="He thong dang chuan bi du lieu checkout." /> : null}
      {!loading && error ? <EmptyState title="Khong the thanh toan" description={error} /> : null}
      {!loading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <StepSection
              index="01"
              title="Chon dia chi giao hang"
              description="Ban co the chon mot trong cac dia chi da luu. Dia chi dang chon se duoc dua vao don hang."
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
                                    Mac dinh
                                  </span>
                                ) : null}
                                {active ? (
                                  <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">
                                    Dang chon
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
                                {active ? "Dia chi dang chon" : "Chon dia chi nay"}
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
                  title="Chua co dia chi giao hang"
                  description="Ban can them it nhat mot dia chi truoc khi dat don hang."
                  action={<Button onClick={() => navigate("/dashboard/customer/address")}>Them dia chi ngay</Button>}
                />
              )}
            </StepSection>

            <StepSection
              index="02"
              title="Lien he va van chuyen"
              description="Email, hinh thuc giao hang va thanh toan se di cung don hang da chon."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Input label="Email nhan thong bao" name="buyerEmail" value={form.buyerEmail} onChange={handleChange} />
                </div>
                <Select
                  label="Phuong thuc giao hang"
                  name="shippingMethod"
                  value={form.shippingMethod}
                  onChange={handleChange}
                  options={shippingMethods}
                />
                <Select
                  label="Phuong thuc thanh toan"
                  name="paymentMethod"
                  value={form.paymentMethod}
                  onChange={handleChange}
                  options={[
                    { label: "VNPAY sandbox", value: "VNPAY" },
                    { label: "Thanh toan khi nhan hang", value: "COD" },
                  ]}
                />
              </div>
            </StepSection>

            <StepSection
              index="03"
              title="San pham da chon"
              description="Chi cac san pham duoc chon o gio hang moi di tiep sang don hang nay."
            >
              <div className="space-y-4">
                {groupedCheckoutItems.map((group) => (
                  <div key={group.groupKey} className="rounded-[1.5rem] bg-slate-50 p-4">
                    <div className="flex items-center gap-4">
                      <img src={group.product.image} alt={group.product.name} className="h-20 w-20 rounded-[1rem] object-cover" />
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{group.product.name}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {group.variant} | Tong x{group.quantity}
                        </p>
                        <p className={`mt-1 text-sm ${group.hasAffiliateAttributed ? "text-emerald-700" : "text-slate-500"}`}>
                          {group.hasAffiliateAttributed
                            ? "Block nay co phan direct va/hoac phan gan affiliate."
                            : "Block nay la don truc tiep."}
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
                ))}
              </div>
            </StepSection>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-700">Don hang</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              <MoneyText value={total} />
            </p>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>So san pham da chon</span>
                <span>{groupedCheckoutItems.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Tam tinh</span>
                <MoneyText value={subtotal} />
              </div>
              <div className="flex justify-between">
                <span>Phi giao hang</span>
                <MoneyText value={form.shippingFee} />
              </div>
              <div className="flex justify-between">
                <span>Giam gia</span>
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
                "Chua chon dia chi giao hang."
              )}
            </div>
            <Button
              className="mt-6 w-full"
              size="lg"
              loading={submitting}
              disabled={!checkoutItems.length || !selectedAddress}
              onClick={handleSubmit}
            >
              {form.paymentMethod === "VNPAY" ? "Sang VNPAY de thanh toan" : "Xac nhan dat hang"}
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
