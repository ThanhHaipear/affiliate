const prisma = require("../../config/prisma");

async function appendShippingSnapshot(order) {
  if (!order) {
    return order;
  }

  const snapshots = await prisma.$queryRaw`
    SELECT
      id,
      shipping_address_id AS shippingAddressId,
      shipping_recipient_name AS shippingRecipientName,
      shipping_phone AS shippingPhone,
      shipping_province AS shippingProvince,
      shipping_district AS shippingDistrict,
      shipping_ward AS shippingWard,
      shipping_detail AS shippingDetail,
      shipping_method AS shippingMethod
    FROM orders
    WHERE id = ${BigInt(order.id)}
    LIMIT 1
  `;

  return {
    ...order,
    ...(snapshots[0] || {}),
  };
}

exports.listOrders = (accountId, roles) => {
  if (roles.includes("SELLER")) {
    return prisma.order.findMany({
      where: { seller: { ownerAccountId: accountId } },
      include: { items: true, payments: true, refunds: { orderBy: { createdAt: "desc" } } },
      orderBy: { createdAt: "desc" }
    });
  }

  return prisma.order.findMany({
    where: { buyerId: accountId },
    include: { items: true, payments: true, refunds: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" }
  });
};

exports.getOrder = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: BigInt(orderId) },
    include: {
      items: true,
      payments: true,
      histories: true,
      refunds: { orderBy: { createdAt: "desc" } },
      commissions: { include: { items: true } }
    }
  });

  return appendShippingSnapshot(order);
};
