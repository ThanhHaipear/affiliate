require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const roles = [
    { code: "ADMIN", name: "Administrator" },
    { code: "SELLER", name: "Seller" },
    { code: "AFFILIATE", name: "Affiliate" },
    { code: "CUSTOMER", name: "Customer" }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: { ...role, createdAt: new Date() }
    });
  }

  const categories = [
    { name: "Digital Product", slug: "digital-product" },
    { name: "Education", slug: "education" },
    { name: "Electronics", slug: "electronics" },
    { name: "Service", slug: "service" }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: { ...category, createdAt: new Date() }
    });
  }

  await prisma.platformFeeConfig.createMany({
    data: [{ feeType: "PERCENT", feeValue: BigInt(5), effectiveFrom: new Date(), createdAt: new Date() }],
    skipDuplicates: true
  });

  await prisma.withdrawalConfig.createMany({
    data: [
      { targetType: "AFFILIATE", minAmount: BigInt(100000), maxAmount: BigInt(100000000), effectiveFrom: new Date(), createdAt: new Date(), updatedAt: new Date() },
      { targetType: "SELLER", minAmount: BigInt(100000), maxAmount: BigInt(500000000), effectiveFrom: new Date(), createdAt: new Date(), updatedAt: new Date() }
    ],
    skipDuplicates: true
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
