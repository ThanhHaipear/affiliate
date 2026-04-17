function buildSellerOrderTimeline(order) {
  const payment = order.payments?.[0];
  const isRefunded = order.status === "REFUNDED" || order.payment_status === "REFUNDED";
  const isSettled = Boolean(order.sellerConfirmedReceivedMoney) || order.status === "COMPLETED";

  const events = [
    {
      id: `${order.id}-created`,
      label: "Don hang da tao",
      time: order.createdAt,
      description: `Don ${order.orderCode || order.code} da duoc tao trong he thong.`,
    },
  ];

  if (payment?.paidAt || order.payment_status === "PAID" || order.status === "PAID") {
    events.push({
      id: `${order.id}-paid`,
      label: "Da thanh toan",
      time: payment?.paidAt || order.updatedAt || order.createdAt,
      description: "Thanh toan cua khach da duoc ghi nhan thanh cong.",
    });
  }

  if (isRefunded) {
    events.push({
      id: `${order.id}-refunded`,
      label: "Da hoan tien",
      time: order.updatedAt || order.createdAt,
      description: "Don hang da duoc hoan tien nen shop khong nhan tien va affiliate khong duoc cong hoa hong.",
    });
    return events;
  }

  if (isSettled) {
    events.push({
      id: `${order.id}-settled`,
      label: "Don da hoan tat",
      time: order.sellerConfirmedAt || order.updatedAt || order.createdAt,
      description: "Shop da xac nhan nhan tien. He thong da hoan tat don hang va ghi nhan tien shop, phi san va hoa hong affiliate neu co.",
    });
    return events;
  }

  events.push({
    id: `${order.id}-waiting-settlement`,
    label: "Cho shop xu ly",
    time: order.updatedAt || order.createdAt,
    description: "Don dang cho shop chon xac nhan da nhan tien hoac hoan tien.",
  });

  return events;
}

export { buildSellerOrderTimeline };
