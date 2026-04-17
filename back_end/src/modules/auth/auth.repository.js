const prisma = require("../../config/prisma");
const { notifyAdmins } = require("../../utils/admin-notifications");

const slugify = (value) => String(value || "channel")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "") || "channel";

exports.findAccountByEmail = (email) => prisma.account.findUnique({
  where: { email },
  include: {
    accountRoles: {
      include: { role: true },
    },
    customerProfile: true,
    affiliate: true,
  },
});

exports.findExistingAccount = ({ email }) => {
  if (!email) {
    return null;
  }

  return prisma.account.findUnique({
    where: { email },
    include: {
      accountRoles: {
        include: { role: true },
      },
      customerProfile: true,
      affiliate: true,
    },
  });
};

exports.findAccountById = (id) => prisma.account.findUnique({
  where: { id },
  include: {
    accountRoles: {
      include: { role: true },
    },
    customerProfile: true,
    affiliate: true,
  },
});

exports.createAccountGraph = (data) => prisma.$transaction(async (tx) => {
  const now = new Date();
  const account = await tx.account.create({
    data: data.account,
  });

  const role = await tx.role.findUnique({ where: { code: data.roleCode } });
  await tx.accountRole.create({ data: { accountId: account.id, roleId: role.id } });

  if (data.roleCode === "CUSTOMER") {
    await tx.customerProfile.create({ data: { accountId: account.id, fullName: data.fullName } });
  }

  if (data.roleCode === "AFFILIATE") {
    const affiliate = await tx.affiliate.create({
      data: {
        accountId: account.id,
        fullName: data.fullName,
        createdAt: now,
        updatedAt: now,
      },
    });

    const paymentAccount = await tx.affiliatePaymentAccount.create({
      data: {
        affiliateId: affiliate.accountId,
        type: data.paymentMethod,
        accountName: data.bankAccountName,
        accountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        branch: data.businessName || null,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.affiliate.update({
      where: { accountId: affiliate.accountId },
      data: {
        defaultPaymentAccountId: paymentAccount.id,
        updatedAt: now,
      },
    });

    await tx.affiliateChannel.create({
      data: {
        affiliateId: affiliate.accountId,
        platform: data.channelName,
        url: `https://channel.pending/${slugify(data.channelName)}`,
        description: data.businessName || null,
        createdAt: now,
        updatedAt: now,
      },
    });

    await notifyAdmins(tx, {
      title: "Pending affiliate",
      content: `${data.fullName || data.account.email || `Affiliate #${affiliate.accountId}`} has entered the affiliate review queue.`,
      type: "ADMIN_PENDING_AFFILIATE",
      targetType: "AFFILIATE",
      targetId: BigInt(affiliate.accountId),
      createdAt: now,
    });
  }

  if (data.roleCode === "SELLER") {
    const seller = await tx.seller.create({
      data: {
        ownerAccountId: account.id,
        shopName: data.shopName,
        email: data.account.email,
        phone: data.account.phone,
        businessField: data.businessName || null,
        createdAt: now,
        updatedAt: now,
      },
    });

    const paymentAccount = await tx.sellerPaymentAccount.create({
      data: {
        sellerId: seller.id,
        type: data.paymentMethod,
        accountName: data.bankAccountName,
        accountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        branch: data.businessName || null,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.seller.update({
      where: { id: seller.id },
      data: {
        defaultPaymentAccountId: paymentAccount.id,
        updatedAt: now,
      },
    });

    await notifyAdmins(tx, {
      title: "Pending seller",
      content: `${data.shopName || `Seller #${seller.id}`} has entered the seller approval queue.`,
      type: "ADMIN_PENDING_SELLER",
      targetType: "SELLER",
      targetId: BigInt(seller.id),
      createdAt: now,
    });
  }

  return tx.account.findUnique({
    where: { id: account.id },
    include: { accountRoles: { include: { role: true } }, customerProfile: true, affiliate: true },
  });
});

exports.createAffiliateRole = (accountId, data) => prisma.$transaction(async (tx) => {
  const now = new Date();
  const account = await tx.account.findUnique({
    where: { id: accountId },
    include: {
      accountRoles: { include: { role: true } },
      customerProfile: true,
      affiliate: true,
    },
  });

  if (!account.affiliate) {
    await tx.affiliate.create({
      data: {
        accountId,
        fullName: data.fullName,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  const paymentAccount = await tx.affiliatePaymentAccount.create({
    data: {
      affiliateId: accountId,
      type: data.paymentMethod,
      accountName: data.bankAccountName,
      accountNumber: data.bankAccountNumber,
      bankName: data.bankName,
      branch: data.businessName || null,
      createdAt: now,
      updatedAt: now,
    },
  });

  await tx.affiliate.update({
    where: { accountId },
    data: {
      fullName: data.fullName,
      defaultPaymentAccountId: paymentAccount.id,
      updatedAt: now,
    },
  });

  await tx.affiliateChannel.create({
    data: {
      affiliateId: accountId,
      platform: data.channelName,
      url: `https://channel.pending/${slugify(data.channelName)}`,
      description: data.businessName || null,
      createdAt: now,
      updatedAt: now,
    },
  });

  await notifyAdmins(tx, {
    title: "Pending affiliate",
    content: `${data.fullName || account.email || `Affiliate #${accountId}`} has entered the affiliate review queue.`,
    type: "ADMIN_PENDING_AFFILIATE",
    targetType: "AFFILIATE",
    targetId: BigInt(accountId),
    createdAt: now,
  });

  return tx.account.findUnique({
    where: { id: accountId },
    include: { accountRoles: { include: { role: true } }, customerProfile: true, affiliate: true },
  });
});

exports.updateLastLogin = (id) => prisma.account.update({
  where: { id },
  data: { lastLoginAt: new Date() },
});

exports.changePassword = (id, passwordHash) => prisma.account.update({
  where: { id },
  data: { passwordHash, updatedAt: new Date() },
});

exports.invalidatePasswordResetTokens = (accountId) => prisma.passwordResetToken.updateMany({
  where: {
    accountId,
    consumedAt: null,
  },
  data: {
    consumedAt: new Date(),
  },
});

exports.createPasswordResetToken = ({ accountId, tokenHash, expiresAt }) =>
  prisma.passwordResetToken.create({
    data: {
      accountId,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    },
  });

exports.findActivePasswordResetToken = (tokenHash) =>
  prisma.passwordResetToken.findFirst({
    where: {
      tokenHash,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      account: true,
    },
  });

exports.consumePasswordResetToken = (id) => prisma.passwordResetToken.update({
  where: { id },
  data: {
    consumedAt: new Date(),
  },
});
