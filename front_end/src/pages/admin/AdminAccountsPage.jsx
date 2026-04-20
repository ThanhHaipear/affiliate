import { useEffect, useMemo, useState } from "react";
import { getAdminUsers, lockUser, unlockUserByTarget } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminAccountDto } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

const ACCOUNTS_PER_PAGE = 8;

const roleOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Quản trị viên", value: "ADMIN" },
  { label: "Người bán", value: "SELLER" },
  { label: "Affiliate", value: "AFFILIATE" },
  { label: "Khách hàng", value: "CUSTOMER" },
];

const statusOptions = [
  { label: "Tất cả", value: "ALL" },
  { label: "Đang hoạt động", value: "ACTIVE" },
  { label: "Đã khóa", value: "LOCKED" },
  { label: "Chờ duyệt", value: "PENDING" },
];

function formatRoleLabel(label = "") {
  return String(label)
    .replace("ADMIN", "QUẢN TRỊ VIÊN")
    .replace("SELLER", "NGƯỜI BÁN")
    .replace("AFFILIATE", "AFFILIATE")
    .replace("CUSTOMER", "KHÁCH HÀNG");
}

function AdminAccountsPage() {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedAction, setSelectedAction] = useState("");
  const [lockReason, setLockReason] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [role, search, status]);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminUsers();
      setAccounts((response || []).map(mapAdminAccountDto));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được danh sách tài khoản.");
    } finally {
      setLoading(false);
    }
  }

  function getActionOptions(account) {
    if (!account) {
      return [];
    }

    if (account.isAccountLocked) {
      return [{ value: "UNLOCK_ALL", label: "Mở khóa toàn bộ tài khoản" }];
    }

    const options = [];

    if (!account.isFullyRoleLocked) {
      options.push({ value: "LOCK_ALL", label: "Khóa toàn bộ tài khoản" });
    }

    if (account.hasCustomerCapability) {
      if (account.customerLocked) {
        options.push({ value: "UNLOCK_CUSTOMER", label: "Mở khóa vai trò khách hàng" });
      } else if (account.roles.includes("CUSTOMER")) {
        options.push({ value: "LOCK_CUSTOMER", label: "Khóa vai trò khách hàng" });
      }
    }

    if (account.hasAffiliateCapability) {
      if (account.affiliateLocked) {
        options.push({ value: "UNLOCK_AFFILIATE", label: "Mở khóa vai trò affiliate" });
      } else if (account.roles.includes("AFFILIATE")) {
        options.push({ value: "LOCK_AFFILIATE", label: "Khóa vai trò affiliate" });
      }
    }

    return options;
  }

  function openAccountActionModal(account) {
    setSelectedAccount(account);
    setSelectedAction(getActionOptions(account)[0]?.value || "");
  }

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchSearch =
        !search ||
        [
          account.displayName,
          account.email,
          account.phone,
          account.roles.join(" "),
          account.roleLabels.join(" "),
          account.customerLocked ? "customer-locked" : "",
          account.affiliateLocked ? "affiliate-locked" : "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchRole =
        role === "ALL" ||
        account.roles.includes(role) ||
        (role === "CUSTOMER" && account.hasCustomerCapability) ||
        (role === "AFFILIATE" && account.hasAffiliateCapability);
      const matchStatus = status === "ALL" || account.status === status;
      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, role, search, status]);

  const summary = useMemo(() => {
    return filteredAccounts.reduce(
      (result, account) => ({
        total: result.total + 1,
        locked: result.locked + (account.status === "LOCKED" ? 1 : 0),
        customerLocked: result.customerLocked + (account.customerLocked ? 1 : 0),
        affiliateLocked: result.affiliateLocked + (account.affiliateLocked ? 1 : 0),
      }),
      { total: 0, locked: 0, customerLocked: 0, affiliateLocked: 0 },
    );
  }, [filteredAccounts]);

  const totalPages = Math.max(1, Math.ceil(filteredAccounts.length / ACCOUNTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedAccounts = useMemo(() => {
    const startIndex = (currentPage - 1) * ACCOUNTS_PER_PAGE;
    return filteredAccounts.slice(startIndex, startIndex + ACCOUNTS_PER_PAGE);
  }, [currentPage, filteredAccounts]);

  async function handleConfirmAction() {
    if (!selectedAccount || !selectedAction) {
      return;
    }

    try {
      setSubmitting(true);

      if (selectedAction === "UNLOCK_ALL") {
        await unlockUserByTarget(selectedAccount.id, { target: "ALL" });
        toast.success("Đã mở khóa toàn bộ tài khoản.");
      } else if (selectedAction === "UNLOCK_CUSTOMER") {
        await unlockUserByTarget(selectedAccount.id, { target: "CUSTOMER" });
        toast.success("Đã mở khóa vai trò khách hàng.");
      } else if (selectedAction === "UNLOCK_AFFILIATE") {
        await unlockUserByTarget(selectedAccount.id, { target: "AFFILIATE" });
        toast.success("Đã mở khóa vai trò affiliate.");
      } else if (selectedAction === "LOCK_CUSTOMER") {
        await lockUser(selectedAccount.id, { target: "CUSTOMER", reason: lockReason });
        toast.success("Đã khóa vai trò khách hàng.");
      } else if (selectedAction === "LOCK_AFFILIATE") {
        await lockUser(selectedAccount.id, { target: "AFFILIATE", reason: lockReason });
        toast.success("Đã khóa vai trò affiliate.");
      } else {
        await lockUser(selectedAccount.id, { target: "ALL", reason: lockReason });
        toast.success("Đã khóa toàn bộ tài khoản.");
      }

      setSelectedAccount(null);
      setSelectedAction("");
      setLockReason("");
      await loadAccounts();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không cập nhật được tài khoản.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Đang tải danh sách tài khoản..." />;
  }

  if (error) {
    return <EmptyState title="Không tải được tài khoản" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị tài khoản"
        title="Tài khoản"
        description="Bạn có thể khóa toàn bộ tài khoản hoặc khóa riêng từng vai trò khách hàng và affiliate trên cùng một tài khoản."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Tổng tài khoản" value={summary.total.toLocaleString("vi-VN")} tone="cyan" />
        <AdminStatCard label="Khóa toàn bộ" value={summary.locked.toLocaleString("vi-VN")} meta="Khóa cấp tài khoản" tone="rose" />
        <AdminStatCard label="Khách hàng bị khóa" value={summary.customerLocked.toLocaleString("vi-VN")} meta="Khóa riêng vai trò khách hàng" tone="amber" />
        <AdminStatCard label="Affiliate bị khóa" value={summary.affiliateLocked.toLocaleString("vi-VN")} meta="Khóa riêng vai trò affiliate" tone="emerald" />
      </div>

      <div className="grid gap-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
        <Input
          label="Tìm kiếm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Email, số điện thoại, tên, shop..."
        />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Vai trò</span>
          <select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={role} onChange={(event) => setRole(event.target.value)}>
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Trạng thái</span>
          <select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={status} onChange={(event) => setStatus(event.target.value)}>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <DataTable
        columns={[
          {
            key: "displayName",
            title: "Tài khoản",
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900">{row.displayName}</p>
                <p className="mt-1 text-xs text-slate-500">ID #{row.id}</p>
              </div>
            ),
          },
          {
            key: "contact",
            title: "Liên hệ",
            render: (row) => (
              <div className="space-y-1">
                <p>{row.email}</p>
                <p className="text-xs text-slate-500">{row.phone}</p>
              </div>
            ),
          },
          {
            key: "roles",
            title: "Vai trò",
            render: (row) => row.roleLabels.map(formatRoleLabel).join(", ") || "--",
          },
          {
            key: "roleLocks",
            title: "Khóa theo vai trò",
            render: (row) => {
              if (row.isFullyRoleLocked) {
                return "Đã khóa toàn bộ vai trò";
              }

              const states = [];

              if (row.customerLocked) {
                states.push("Khách hàng đã khóa");
              }

              if (row.affiliateLocked) {
                states.push("Affiliate đã khóa");
              }

              return states.length ? states.join(" | ") : "Không";
            },
          },
          {
            key: "status",
            title: "Trạng thái",
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "lastLoginAt",
            title: "Lần đăng nhập",
            render: (row) => formatDateTime(row.lastLoginAt),
          },
          {
            key: "actions",
            title: "Hành động",
            render: (row) => (
              <Button size="sm" variant={row.status === "LOCKED" ? "primary" : "danger"} onClick={() => openAccountActionModal(row)}>
                Quản lý khóa
              </Button>
            ),
          },
        ]}
        rows={paginatedAccounts}
        emptyTitle="Không có tài khoản phù hợp"
        emptyDescription="Thử đổi bộ lọc hoặc tìm kiếm theo email, số điện thoại, vai trò."
      />

      {filteredAccounts.length > ACCOUNTS_PER_PAGE ? (
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
      ) : null}

      <ConfirmModal
        open={Boolean(selectedAccount)}
        title="Quản lý khóa tài khoản"
        description={selectedAccount ? `Xác nhận thao tác với ${selectedAccount.displayName}.` : ""}
        confirmLabel={selectedAction.startsWith("UNLOCK") ? "Mở khóa" : "Khóa"}
        confirmVariant={selectedAction.startsWith("UNLOCK") ? "primary" : "danger"}
        loading={submitting}
        onClose={() => {
          setSelectedAccount(null);
          setSelectedAction("");
          setLockReason("");
        }}
        onConfirm={handleConfirmAction}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">Phạm vi thao tác</span>
          <select
            value={selectedAction}
            onChange={(event) => setSelectedAction(event.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-emerald-500"
          >
            {getActionOptions(selectedAccount).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {!selectedAction.startsWith("UNLOCK") ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Lý do khóa</span>
            <textarea
              value={lockReason}
              onChange={(event) => setLockReason(event.target.value)}
              rows={4}
              placeholder="Nhập lý do vi phạm, gian lận, spam..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
            />
          </label>
        ) : (
          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-7 text-slate-300">
            {selectedAccount?.isAccountLocked
              ? `Tài khoản đang bị khóa toàn bộ. Lý do hiện tại: ${selectedAccount?.lockReason || "Không có ghi chú."}`
              : selectedAccount?.isFullyRoleLocked
                ? "Tài khoản hiện đã bị khóa toàn bộ theo vai trò. Bạn có thể mở lại từng vai trò riêng lẻ."
                : [
                  selectedAccount?.customerLocked ? "Khách hàng đang bị khóa." : null,
                  selectedAccount?.affiliateLocked ? "Affiliate đang bị khóa." : null,
                ].filter(Boolean).join(" ") || "Không có vai trò nào đang bị khóa."}
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}

export default AdminAccountsPage;
