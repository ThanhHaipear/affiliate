import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  createCustomerAddress,
  deleteCustomerAddress,
  getCustomerAddresses,
  setDefaultCustomerAddress,
  updateCustomerAddress,
} from "../../../api/customerAddressApi";
import Button from "../../../components/common/Button";
import EmptyState from "../../../components/common/EmptyState";
import Input from "../../../components/common/Input";
import PageHeader from "../../../components/common/PageHeader";
import { useToast } from "../../../hooks/useToast";
import { customerAddressSchema } from "../../../schemas/customerSchemas";

const emptyAddress = {
  recipientName: "",
  phone: "",
  province: "",
  district: "",
  ward: "",
  detail: "",
  isDefault: false,
};

function CustomerAddressPage() {
  const toast = useToast();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(customerAddressSchema),
    defaultValues: emptyAddress,
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const isEditing = useMemo(() => editingId !== null, [editingId]);

  async function loadAddresses() {
    try {
      setLoading(true);
      setError("");
      const response = await getCustomerAddresses();
      setAddresses(response || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được danh sách địa chỉ giao hàng.");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(address) {
    setEditingId(address.id);
    reset({
      recipientName: address.recipientName || "",
      phone: address.phone || "",
      province: address.province || "",
      district: address.district || "",
      ward: address.ward || "",
      detail: address.detail || "",
      isDefault: Boolean(address.isDefault),
    });
  }

  function handleCreateNew() {
    setEditingId(null);
    reset(emptyAddress);
  }

  async function handleDelete(addressId) {
    const confirmed = window.confirm("Bạn có chắc muốn xóa địa chỉ này?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteCustomerAddress(addressId);
      toast.success("Đã xóa địa chỉ giao hàng.");
      if (editingId === addressId) {
        handleCreateNew();
      }
      await loadAddresses();
    } catch (deleteError) {
      toast.error(deleteError.response?.data?.message || "Không xóa được địa chỉ giao hàng.");
    }
  }

  async function handleSetDefault(addressId) {
    try {
      await setDefaultCustomerAddress(addressId);
      toast.success("Đã cập nhật địa chỉ mặc định.");
      await loadAddresses();
    } catch (setDefaultError) {
      toast.error(setDefaultError.response?.data?.message || "Không cập nhật được địa chỉ mặc định.");
    }
  }

  async function onSubmit(values) {
    try {
      if (isEditing) {
        await updateCustomerAddress(editingId, values);
        toast.success("Đã cập nhật địa chỉ giao hàng.");
      } else {
        await createCustomerAddress(values);
        toast.success("Đã thêm địa chỉ giao hàng.");
      }

      handleCreateNew();
      await loadAddresses();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không lưu được địa chỉ giao hàng.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Khách hàng"
        title="Địa chỉ giao hàng"

      />
      {loading ? <EmptyState title="Đang tải địa chỉ" description="Hệ thống đang lấy danh sách địa chỉ giao hàng của bạn." /> : null}
      {!loading && error ? <EmptyState title="Không tải được địa chỉ" description={error} /> : null}
      {!loading && !error ? (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            {addresses.length ? (
              addresses.map((address) => (
                <div key={address.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{address.recipientName}</p>
                      <p className="mt-2 text-sm text-slate-600">{address.phone}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {address.detail}, {address.ward}, {address.district}, {address.province}
                      </p>
                    </div>
                    {address.isDefault ? (
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                        Mặc định
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button variant="secondary" size="sm" onClick={() => handleEdit(address)}>
                      Chỉnh sửa
                    </Button>
                    {!address.isDefault ? (
                      <Button variant="outline" size="sm" onClick={() => handleSetDefault(address.id)}>
                        Đặt mặc định
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => handleDelete(address.id)}>
                      Xóa
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="Chưa có địa chỉ" description="Thêm địa chỉ giao hàng để chọn nhanh khi checkout." />
            )}
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">
              {isEditing ? "Cập nhật địa chỉ" : "Thêm địa chỉ mới"}
            </h3>
            <form className="mt-5 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Tên người nhận" error={errors.recipientName?.message} {...register("recipientName")} />
                <Input label="Số điện thoại" error={errors.phone?.message} {...register("phone")} />
                <Input label="Tỉnh thành" error={errors.province?.message} {...register("province")} />
                <Input label="Quận huyện" error={errors.district?.message} {...register("district")} />
                <Input label="Phường xã" error={errors.ward?.message} {...register("ward")} />
                <div className="md:col-span-2">
                  <Input label="Địa chỉ cụ thể" error={errors.detail?.message} {...register("detail")} />
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-[1rem] bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <input type="checkbox" {...register("isDefault")} />
                Đặt làm địa chỉ mặc định
              </label>
              <div className="flex flex-wrap gap-3">
                <Button type="submit" loading={isSubmitting}>
                  {isEditing ? "Lưu cập nhật" : "Lưu địa chỉ"}
                </Button>
                {isEditing ? (
                  <Button type="button" variant="outline" onClick={handleCreateNew}>
                    Hủy chỉnh sửa
                  </Button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default CustomerAddressPage;
