import { formatDateTime, formatStatusLabel } from "../../lib/format";

function OrderStatusTimeline({ order }) {
  const timeline = [
    { key: "created", label: "Tao don", at: order.created_at },
    { key: order.payment_status, label: `Thanh toan: ${formatStatusLabel(order.payment_status)}`, at: order.updated_at },
    { key: order.order_status, label: `Don hang: ${formatStatusLabel(order.order_status)}`, at: order.updated_at },
  ];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Timeline don hang</h3>
      <div className="mt-5 space-y-4">
        {timeline.map((item, index) => (
          <div key={`${item.key}-${index}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              {index < timeline.length - 1 ? <span className="mt-2 h-full w-px bg-slate-200" /> : null}
            </div>
            <div>
              <p className="font-medium text-slate-900">{item.label}</p>
              <p className="mt-1 text-sm text-slate-500">{formatDateTime(item.at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OrderStatusTimeline;
