import { useEffect, useMemo, useState } from "react";
import { getAdminUsers, lockUser, unlockUser } from "../../api/adminApi";
import AdminStatCard from "../../components/admin/AdminStatCard";
import Button from "../../components/common/Button";
import ConfirmModal from "../../components/common/ConfirmModal";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import PageHeader from "../../components/common/PageHeader";
import StatusBadge from "../../components/common/StatusBadge";
import { useToast } from "../../hooks/useToast";
import { mapAdminAccountDto } from "../../lib/adminMappers";
import { formatDateTime } from "../../lib/format";

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
  const [lockReason, setLockReason] = useState("");

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminUsers();
      setAccounts((response || []).map(mapAdminAccountDto));
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Khong tai duoc danh sach tai khoan.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return accounts.filter((account) => {
      const matchSearch =
        !search ||
        [account.displayName, account.email, account.phone, account.roles.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchRole = role === "ALL" || account.roles.includes(role);
      const matchStatus = status === "ALL" || account.status === status;
      return matchSearch && matchRole && matchStatus;
    });
  }, [accounts, role, search, status]);

  const summary = useMemo(() => {
    return filtered.reduce(
      (result, account) => {
        result.total += 1;
        if (account.status === "LOCKED") result.locked += 1;
        if (account.roles.includes("SELLER")) result.sellers += 1;
        if (account.roles.includes("AFFILIATE")) result.affiliates += 1;
        return result;
      },
      { total: 0, locked: 0, sellers: 0, affiliates: 0 },
    );
  }, [filtered]);

  async function handleConfirmAction() {
    if (!selectedAccount) {
      return;
    }

    try {
      setSubmitting(true);
      if (selectedAccount.status === "LOCKED") {
        await unlockUser(selectedAccount.id);
        toast.success("Da mo khoa tai khoan.");
      } else {
        await lockUser(selectedAccount.id, { reason: lockReason });
        toast.success("Da khoa tai khoan.");
      }
      setSelectedAccount(null);
      setLockReason("");
      await loadAccounts();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Khong cap nhat duoc tai khoan.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner label="Dang tai danh sach tai khoan..." />;
  }

  if (error) {
    return <EmptyState title="Khong tai duoc admin accounts" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Accounts control center"
        description="Danh sach tai khoan admin, seller, affiliate va customer dang doc truc tiep tu database. Ban co the lock hoac unlock ngay tai day."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Tong tai khoan" value={summary.total.toLocaleString("vi-VN")} meta="Theo bo loc hien tai" tone="cyan" />
        <AdminStatCard label="Dang bi khoa" value={summary.locked.toLocaleString("vi-VN")} meta="Can review ly do vi pham" tone="rose" />
        <AdminStatCard label="Seller" value={summary.sellers.toLocaleString("vi-VN")} meta="Co vai tro seller" tone="amber" />
        <AdminStatCard label="Affiliate" value={summary.affiliates.toLocaleString("vi-VN")} meta="Co vai tro affiliate" tone="emerald" />
      </div>

      <div className="grid gap-4 rounded-[2rem] border border-slate-300 bg-white p-6 shadow-sm lg:grid-cols-[1.5fr_0.7fr_0.7fr]">
        <Input label="Tim kiem" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email, phone, ten, shop..." />
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Vai tro</span>
          <select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="ALL">Tat ca</option>
            <option value="ADMIN">Admin</option>
            <option value="SELLER">Seller</option>
            <option value="AFFILIATE">Affiliate</option>
            <option value="CUSTOMER">Customer</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Trang thai</span>
          <select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Tat ca</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="LOCKED">LOCKED</option>
            <option value="PENDING">PENDING</option>
          </select>
        </label>
      </div>

      <DataTable
        columns={[
          {
            key: "displayName",
            title: "Tai khoan",
            render: (row) => (
              <div>
                <p className="font-medium text-slate-900">{row.displayName}</p>
                <p className="mt-1 text-xs text-slate-500">ID #{row.id}</p>
              </div>
            ),
          },
          {
            key: "contact",
            title: "Lien he",
            render: (row) => (
              <div className="space-y-1">
                <p>{row.email}</p>
                <p className="text-xs text-slate-500">{row.phone}</p>
              </div>
            ),
          },
          {
            key: "roles",
            title: "Vai tro",
            render: (row) => row.roles.join(", "),
          },
          {
            key: "status",
            title: "Trang thai",
            render: (row) => <StatusBadge status={row.status} />,
          },
          {
            key: "lastLoginAt",
            title: "Lan dang nhap",
            render: (row) => formatDateTime(row.lastLoginAt),
          },
          {
            key: "actions",
            title: "Hanh dong",
            render: (row) => (
              <Button size="sm" variant={row.status === "LOCKED" ? "primary" : "danger"} onClick={() => setSelectedAccount(row)}>
                {row.status === "LOCKED" ? "Unlock" : "Lock"}
              </Button>
            ),
          },
        ]}
        rows={filtered}
        emptyTitle="Khong co tai khoan phu hop"
        emptyDescription="Thu doi bo loc hoac tim kiem theo email, phone, vai tro."
      />

      <ConfirmModal
        open={Boolean(selectedAccount)}
        title={selectedAccount?.status === "LOCKED" ? "Mo khoa tai khoan" : "Khoa tai khoan"}
        description={selectedAccount ? `Xac nhan thao tac voi ${selectedAccount.displayName}.` : ""}
        confirmLabel={selectedAccount?.status === "LOCKED" ? "Mo khoa" : "Khoa tai khoan"}
        confirmVariant={selectedAccount?.status === "LOCKED" ? "primary" : "danger"}
        loading={submitting}
        onClose={() => {
          setSelectedAccount(null);
          setLockReason("");
        }}
        onConfirm={handleConfirmAction}
      >
        {selectedAccount?.status !== "LOCKED" ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-200">Ly do khoa</span>
            <textarea
              value={lockReason}
              onChange={(event) => setLockReason(event.target.value)}
              rows={4}
              placeholder="Nhap ly do vi pham, gian lan, spam..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
            />
          </label>
        ) : (
          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-7 text-slate-300">
            Ly do khoa hien tai: {selectedAccount?.lockReason || "Khong co ghi chu."}
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}

export default AdminAccountsPage;
