import Button from "./Button";

function Pagination({
  page = 1,
  totalPages = 1,
  onPageChange,
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
      <span>
        Trang {page} / {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
        >
          Trước
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}

export default Pagination;
