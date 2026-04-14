async function listAdminAccountIds(tx) {
  const admins = await tx.account.findMany({
    where: {
      accountRoles: {
        some: {
          role: { code: "ADMIN" },
        },
      },
    },
    select: { id: true },
  });

  return admins.map((admin) => admin.id);
}

async function notifyAdmins(tx, payload) {
  const adminAccountIds = await listAdminAccountIds(tx);
  const createdAt = payload.createdAt || new Date();

  for (const accountId of adminAccountIds) {
    const existing = await tx.notification.findFirst({
      where: {
        accountId,
        type: payload.type,
        targetType: payload.targetType || null,
        targetId: payload.targetId ?? null,
        isRead: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await tx.notification.update({
        where: { id: existing.id },
        data: {
          title: payload.title,
          content: payload.content,
          createdAt,
          readAt: null,
          isRead: false,
        },
      });
      continue;
    }

    await tx.notification.create({
      data: {
        accountId,
        title: payload.title,
        content: payload.content,
        type: payload.type,
        targetType: payload.targetType,
        targetId: payload.targetId,
        createdAt,
      },
    });
  }
}

module.exports = {
  notifyAdmins,
};
