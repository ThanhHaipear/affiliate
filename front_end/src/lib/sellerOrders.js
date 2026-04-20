function buildSellerOrderTimeline(order) {
  const payment = order.payments?.[0];
  const isRefunded = order.status === "REFUNDED" || order.payment_status === "REFUNDED";
  const isSettled = Boolean(order.sellerConfirmedReceivedMoney) || order.status === "COMPLETED";

  const events = [
    {
      id: `${order.id}-created`,
      label: "Đơn hàng đã tạo",
      time: order.createdAt,
      description: `Đơn ${order.orderCode || order.code} đã được tạo trong hệ thống.`,
    },
  ];

  if (payment?.paidAt || order.payment_status === "PAID" || order.status === "PAID") {
    events.push({
      id: `${order.id}-paid`,
      label: "Đã thanh toán",
      time: payment?.paidAt || order.updatedAt || order.createdAt,
      description: "Thanh toán của khách đã được ghi nhận thành công.",
    });
  }

  if (isRefunded) {
    events.push({
      id: `${order.id}-refunded`,
      label: "Đã hoàn tiền",
      time: order.updatedAt || order.createdAt,
      description: "Đơn hàng đã được hoàn tiền nên shop không nhận tiền và affiliate không được cộng hoa hồng.",
    });
    return events;
  }

  if (isSettled) {
    events.push({
      id: `${order.id}-settled`,
      label: "Đơn đã hoàn tất",
      time: order.sellerConfirmedAt || order.updatedAt || order.createdAt,
      description: "Shop đã xác nhận nhận tiền. Hệ thống đã hoàn tất đơn hàng và ghi nhận tiền shop, phí sàn và hoa hồng affiliate nếu có.",
    });
    return events;
  }

  events.push({
    id: `${order.id}-waiting-settlement`,
    label: "Chờ shop xử lý",
    time: order.updatedAt || order.createdAt,
    description: "Đơn đang chờ shop chọn xác nhận đã nhận tiền hoặc hoàn tiền.",
  });

  return events;
}

export { buildSellerOrderTimeline };
