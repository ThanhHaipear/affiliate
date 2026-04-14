import EmptyState from "./EmptyState";
import { cn } from "../../lib/utils";

function DataTable({
  columns = [],
  rows = [],
  keyField = "id",
  emptyTitle,
  emptyDescription,
  className,
  rowClassName,
}) {
  if (!rows.length) {
    return (
      <EmptyState
        title={emptyTitle || "Không có bản ghi"}
        description={emptyDescription || "Hãy thay đổi bộ lọc hoặc tạo dữ liệu mới."}
      />
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[2rem] border border-slate-300 bg-white shadow-sm",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-4 text-left text-xs font-medium uppercase tracking-[0.2em] text-slate-500"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row[keyField]} className={cn("align-top", rowClassName ? rowClassName(row) : "")}>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-4 text-sm text-slate-700">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DataTable;
