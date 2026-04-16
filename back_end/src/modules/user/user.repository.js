const prisma = require("../../config/prisma");

const mapAccountToCurrentUser = (account) => ({
  id: account.id,
  email: account.email,
  phone: account.phone,
  status: account.status,
  roles: (account.accountRoles || []).map((item) => item.role.code),
  profile: {
    fullName: account.customerProfile?.fullName || "",
    avatarUrl: account.customerProfile?.avatarUrl || "",
    affiliateStatus: account.affiliate?.kycStatus || null,
    hasAffiliateApplication: Boolean(account.affiliate),
  },
});

async function findCustomerAccountRecord(client, accountId) {
  return client.account.findUnique({
    where: { id: accountId },
    include: {
      accountRoles: {
        include: { role: true },
      },
      customerProfile: true,
      affiliate: true,
    },
  });
}

exports.findCustomerProfile = async (accountId) => {
  const account = await findCustomerAccountRecord(prisma, accountId);
  return account ? mapAccountToCurrentUser(account) : null;
};

exports.updateCustomerProfile = async (accountId, payload) => prisma.$transaction(async (tx) => {
  const now = new Date();

  await tx.account.update({
    where: { id: accountId },
    data: {
      phone: payload.phone,
      updatedAt: now,
    },
  });

  await tx.customerProfile.upsert({
    where: { accountId },
    update: {
      fullName: payload.fullName,
      updatedAt: now,
    },
    create: {
      accountId,
      fullName: payload.fullName,
      createdAt: now,
      updatedAt: now,
    },
  });

  const account = await findCustomerAccountRecord(tx, accountId);
  return mapAccountToCurrentUser(account);
});
