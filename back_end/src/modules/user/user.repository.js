const prisma = require("../../config/prisma");

const mapAccountToCurrentUser = (account) => ({
  roles: (account.accountRoles || []).map((item) => item.role.code),
  id: account.id,
  email: account.email,
  phone: account.phone,
  status: account.status,
  profile: {
    fullName: account.customerProfile?.fullName || "",
    avatarUrl: account.customerProfile?.avatarUrl || "",
    hasCustomerCapability: Boolean(account.customerProfile),
    hasAffiliateCapability: Boolean(account.affiliate),
    customerLocked:
      Boolean(account.customerProfile) &&
      !(account.accountRoles || []).some((item) => item.role?.code === "CUSTOMER"),
    customerLockReason:
      Boolean(account.customerProfile) &&
      !(account.accountRoles || []).some((item) => item.role?.code === "CUSTOMER")
        ? account.lockReason || null
        : null,
    affiliateStatus:
      account.affiliate?.activityStatus === "LOCKED"
        ? "LOCKED"
        : account.affiliate?.kycStatus || null,
    affiliateKycStatus: account.affiliate?.kycStatus || null,
    affiliateActivityStatus: account.affiliate?.activityStatus || null,
    affiliateLocked: account.affiliate?.activityStatus === "LOCKED",
    affiliateLockReason: account.affiliate?.activityStatus === "LOCKED" ? account.affiliate?.lockReason || null : null,
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
