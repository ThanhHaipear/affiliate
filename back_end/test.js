
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const APPEAL_INCLUDE = {
  account: {
    select: {
      id: true,
      email: true,
      phone: true,
      customerProfile: { select: { fullName: true, avatarUrl: true } },
      affiliate: { select: { fullName: true, avatarUrl: true } },
      sellers: { select: { shopName: true, logoUrl: true }, orderBy: { createdAt: 'desc' }, take: 1 },
    },
  },
  reviewer: {
    select: {
      id: true,
      email: true,
      adminProfile: { select: { fullName: true } },
    },
  },
  messages: {
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          adminProfile: { select: { fullName: true } },
          customerProfile: { select: { fullName: true } },
          affiliate: { select: { fullName: true } },
          sellers: { select: { shopName: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
};
async function main() {
  try {
    const res = await prisma.appeal.findMany({ where: { accountId: 1 }, include: APPEAL_INCLUDE });
    console.log(res);
  } catch (e) {
    console.log('ERROR:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
