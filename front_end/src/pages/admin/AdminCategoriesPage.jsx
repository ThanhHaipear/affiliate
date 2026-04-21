import { useEffect, useMemo, useState } from "react";
import { createAdminCategory, getAdminCategories } from "../../api/adminApi";
import Button from "../../components/common/Button";
import DataTable from "../../components/common/DataTable";
import EmptyState from "../../components/common/EmptyState";
import Input from "../../components/common/Input";
import PageHeader from "../../components/common/PageHeader";
import Pagination from "../../components/common/Pagination";
import { useToast } from "../../hooks/useToast";
import { formatDateTime } from "../../lib/format";

const CATEGORIES_PER_PAGE = 3;

function AdminCategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({
    name: "",
  });

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");
      const response = await getAdminCategories();
      setCategories(response || []);
    } catch (loadError) {
      setError(loadError.response?.data?.message || "Không tải được danh mục.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedName = form.name.trim();
    if (normalizedName.length < 2) {
      toast.error("Tên danh mục phải có ít nhất 2 ký tự.");
      return;
    }

    try {
      setSubmitting(true);
      await createAdminCategory({
        name: normalizedName,
        parentId: null,
      });
      toast.success("Đã thêm danh mục mới.");
      setForm({ name: "" });
      await loadCategories();
    } catch (submitError) {
      toast.error(submitError.response?.data?.message || "Không tạo được danh mục.");
    } finally {
      setSubmitting(false);
    }
  }

  const rows = useMemo(() => {
    return categories.map((category) => ({
      id: String(category.id),
      name: category.name,
      slug: category.slug || "--",
      childCount: category.children?.length || 0,
      productCount: category._count?.products || 0,
      createdAt: category.createdAt || null,
    }));
  }, [categories]);

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  const totalPages = Math.max(1, Math.ceil(rows.length / CATEGORIES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * CATEGORIES_PER_PAGE;
    return rows.slice(startIndex, startIndex + CATEGORIES_PER_PAGE);
  }, [currentPage, rows]);

  if (loading) {
    return (
      <EmptyState
        title="Đang tải danh mục"
        description="Hệ thống đang lấy danh sách danh mục sản phẩm từ backend."
      />
    );
  }

  if (error) {
    return <EmptyState title="Không tải được danh mục" description={error} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quản trị"
        title="Danh mục"
        description="Xem toàn bộ danh mục sản phẩm và thêm danh mục mới trực tiếp từ trang quản trị."
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Thêm danh mục mới</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Tạo danh mục mới để seller gắn sản phẩm vào đúng nhóm hiển thị trên hệ thống.
          </p>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Tên danh mục"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Nhập tên danh mục"
            />
            <Button type="submit" loading={submitting}>
              Thêm danh mục
            </Button>
          </form>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Toàn bộ danh mục</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Danh sách này hiển thị tất cả danh mục hiện có trong cơ sở dữ liệu.
          </p>

          <div className="mt-5 space-y-4">
            <DataTable
              columns={[
                { key: "name", title: "Tên danh mục" },
                { key: "productCount", title: "Số sản phẩm" },
                { key: "childCount", title: "Danh mục con" },
                { key: "slug", title: "Slug" },
                {
                  key: "createdAt",
                  title: "Ngày tạo",
                  render: (row) => formatDateTime(row.createdAt),
                },
              ]}
              rows={paginatedRows}
              emptyTitle="Chưa có danh mục"
              emptyDescription="Khi bạn tạo danh mục mới, dữ liệu sẽ xuất hiện tại đây."
            />

            {rows.length > CATEGORIES_PER_PAGE ? (
              <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminCategoriesPage;
