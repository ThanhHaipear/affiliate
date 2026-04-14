require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin.test@example.com';
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '123456';
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME || 'Admin Test';

  const role = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
  if (!role) {
    throw new Error('ADMIN role not found. Run prisma seed first.');
  }

  let account = await prisma.account.findFirst({ where: { email } });
  if (!account) {
    const passwordHash = await bcrypt.hash(password, 10);
    account = await prisma.account.create({
      data: {
        email,
        passwordHash,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  const accountRole = await prisma.accountRole.findUnique({
    where: { accountId_roleId: { accountId: account.id, roleId: role.id } }
  });

  if (!accountRole) {
    await prisma.accountRole.create({ data: { accountId: account.id, roleId: role.id } });
  }

  await prisma.adminProfile.upsert({
    where: { accountId: account.id },
    update: { fullName, updatedAt: new Date() },
    create: { accountId: account.id, fullName, createdAt: new Date(), updatedAt: new Date() }
  });

  console.log(JSON.stringify({ accountId: account.id, email, password }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
