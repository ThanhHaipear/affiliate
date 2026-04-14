const prisma = require("../../config/prisma");

const getPrimaryChannel = (channels = []) => channels[0] || null;

const getDefaultPaymentAccount = (affiliate) => {
  const paymentAccounts = affiliate?.paymentAccounts || [];

  if (!paymentAccounts.length) {
    return null;
  }

  if (affiliate?.defaultPaymentAccountId) {
    const matchedAccount = paymentAccounts.find((account) => account.id === affiliate.defaultPaymentAccountId);
    if (matchedAccount) {
      return matchedAccount;
    }
  }

  return paymentAccounts[0] || null;
};

const mapAffiliateProfile = (affiliate, channels) => ({
  ...affiliate,
  channels,
  primaryChannel: getPrimaryChannel(channels),
  defaultPaymentAccount: getDefaultPaymentAccount(affiliate),
});

exports.findAffiliate = async (accountId) => {
  const [affiliate, channels] = await Promise.all([
    prisma.affiliate.findUnique({
      where: { accountId },
      include: {
        account: true,
        paymentAccounts: {
          orderBy: { createdAt: "desc" },
        },
        kyc: { include: { documents: true } },
      },
    }),
    prisma.affiliateChannel.findMany({
      where: { affiliateId: accountId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return affiliate ? mapAffiliateProfile(affiliate, channels) : null;
};

exports.updateProfile = async (accountId, payload) => {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.account.update({
      where: { id: accountId },
      data: {
        phone: payload.phone,
        updatedAt: now,
      },
    });

    const affiliate = await tx.affiliate.update({
      where: { accountId },
      data: {
        fullName: payload.fullName,
        avatarUrl: payload.avatarUrl || null,
        updatedAt: now,
      },
      include: {
        paymentAccounts: true,
      },
    });

    const hasChannelInput = Boolean(payload.channelPlatform || payload.channelUrl || payload.channelDescription);
    if (hasChannelInput) {
      const existingChannel = await tx.affiliateChannel.findFirst({
        where: { affiliateId: accountId },
        orderBy: { createdAt: "desc" },
      });

      const channelData = {
        platform: payload.channelPlatform,
        url: payload.channelUrl,
        description: payload.channelDescription || null,
        updatedAt: now,
      };

      if (existingChannel) {
        await tx.affiliateChannel.update({
          where: { id: existingChannel.id },
          data: channelData,
        });
      } else {
        await tx.affiliateChannel.create({
          data: {
            affiliateId: accountId,
            ...channelData,
            createdAt: now,
          },
        });
      }
    }

    const hasPaymentInput = Boolean(
      payload.paymentType
        || payload.paymentAccountName
        || payload.paymentAccountNumber
        || payload.paymentBankName
        || payload.paymentBranch,
    );

    if (hasPaymentInput) {
      const defaultPaymentAccount = affiliate.paymentAccounts.find(
        (paymentAccount) => affiliate.defaultPaymentAccountId && paymentAccount.id === affiliate.defaultPaymentAccountId,
      ) || affiliate.paymentAccounts[0];

      const paymentData = {
        type: payload.paymentType,
        accountName: payload.paymentAccountName || null,
        accountNumber: payload.paymentAccountNumber || null,
        bankName: payload.paymentBankName || null,
        branch: payload.paymentBranch || null,
        updatedAt: now,
      };

      if (defaultPaymentAccount) {
        await tx.affiliatePaymentAccount.update({
          where: { id: defaultPaymentAccount.id },
          data: paymentData,
        });
      } else {
        const createdPaymentAccount = await tx.affiliatePaymentAccount.create({
          data: {
            affiliateId: accountId,
            ...paymentData,
            createdAt: now,
          },
        });

        await tx.affiliate.update({
          where: { accountId },
          data: {
            defaultPaymentAccountId: createdPaymentAccount.id,
            updatedAt: now,
          },
        });
      }
    }
  });

  return exports.findAffiliate(accountId);
};

exports.submitKyc = (affiliateId, payload) => prisma.$transaction(async (tx) => {
  const kyc = await tx.affiliateKyc.upsert({
    where: { affiliateId },
    update: {
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      fullNameOnDocument: payload.fullNameOnDocument,
      permanentAddress: payload.permanentAddress,
      nationality: payload.nationality,
      status: "PENDING",
      rejectReason: null,
      updatedAt: new Date(),
    },
    create: {
      affiliateId,
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      fullNameOnDocument: payload.fullNameOnDocument,
      permanentAddress: payload.permanentAddress,
      nationality: payload.nationality,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await tx.kycDocument.deleteMany({ where: { affiliateKycId: kyc.id } });
  await tx.kycDocument.createMany({
    data: payload.documentUrls.map((fileUrl) => ({
      affiliateKycId: kyc.id,
      documentKind: "IDENTITY",
      fileUrl,
      createdAt: new Date(),
    })),
  });

  return tx.affiliateKyc.findUnique({ where: { affiliateId }, include: { documents: true } });
});

exports.createChannel = (affiliateId, payload) => prisma.affiliateChannel.create({
  data: { affiliateId, ...payload, createdAt: new Date(), updatedAt: new Date() },
});

exports.createPaymentAccount = (affiliateId, payload) => prisma.$transaction(async (tx) => {
  const account = await tx.affiliatePaymentAccount.create({
    data: {
      affiliateId,
      type: payload.type,
      accountName: payload.accountName,
      accountNumber: payload.accountNumber,
      bankName: payload.bankName,
      branch: payload.branch,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  if (payload.makeDefault) {
    await tx.affiliate.update({ where: { accountId: affiliateId }, data: { defaultPaymentAccountId: account.id, updatedAt: new Date() } });
  }

  return account;
});

exports.getStats = async (affiliateId) => {
  const [clickCount, approvedCommission, pendingCommission, linkCount] = await Promise.all([
    prisma.affiliateClick.count({ where: { affiliateId } }),
    prisma.affiliateCommission.aggregate({ _sum: { totalCommission: true }, where: { affiliateId, status: { in: ["APPROVED", "WALLET_CREDITED", "PAID_OUT"] } } }),
    prisma.affiliateCommission.aggregate({ _sum: { totalCommission: true }, where: { affiliateId, status: "PENDING" } }),
    prisma.affiliateLink.count({ where: { affiliateId } }),
  ]);

  return {
    clickCount,
    linkCount,
    pendingCommission: pendingCommission._sum.totalCommission || 0,
    approvedCommission: approvedCommission._sum.totalCommission || 0,
  };
};
