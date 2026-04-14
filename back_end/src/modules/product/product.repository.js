const prisma = require("../../config/prisma");
const { notifyAdmins } = require("../../utils/admin-notifications");

const approvedSellerWhere = {
  seller: {
    approvalStatus: "APPROVED",
  },
};

exports.listApprovedProducts = () => prisma.product.findMany({
  where: {
    status: "APPROVED",
    ...approvedSellerWhere,
    affiliateSetting: {
      approvalStatus: "APPROVED",
      isEnabled: true,
    },
  },
  include: {
    images: true,
    variants: { include: { inventory: true } },
    affiliateSetting: true,
    seller: true,
  },
  orderBy: { createdAt: "desc" },
});

exports.findApprovedProductById = (id) => prisma.product.findFirst({
  where: {
    id,
    status: "APPROVED",
    ...approvedSellerWhere,
    affiliateSetting: {
      approvalStatus: "APPROVED",
      isEnabled: true,
    },
  },
  include: {
    images: true,
    variants: { include: { inventory: true } },
    affiliateSetting: true,
    seller: true,
    category: true,
  },
});

exports.findProductById = (id) => prisma.product.findUnique({
  where: { id },
  include: {
    images: true,
    variants: { include: { inventory: true } },
    affiliateSetting: true,
    seller: true,
    category: true,
  },
});

exports.createProduct = (sellerId, payload) => prisma.$transaction(async (tx) => {
  const now = new Date();
  const product = await tx.product.create({
    data: {
      sellerId,
      categoryId: payload.categoryId,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      basePrice: BigInt(payload.basePrice),
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    },
  });

  if (payload.images.length) {
    await tx.productImage.createMany({
      data: payload.images.map((image) => ({ productId: product.id, url: image.url, sortOrder: image.sortOrder || 0, createdAt: now })),
    });
  }

  for (const variant of payload.variants) {
    const createdVariant = await tx.productVariant.create({
      data: {
        productId: product.id,
        sku: variant.sku,
        variantName: variant.variantName,
        options: variant.options,
        price: BigInt(variant.price),
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.inventory.create({ data: { variantId: createdVariant.id, quantity: variant.quantity, updatedAt: now } });
  }

  await notifyAdmins(tx, {
    title: "Pending product",
    content: `${payload.name || `Product #${product.id}`} has entered the product review queue.`,
    type: "ADMIN_PENDING_PRODUCT",
    targetType: "PRODUCT",
    targetId: BigInt(product.id),
    createdAt: now,
  });

  return tx.product.findUnique({ where: { id: product.id }, include: { images: true, variants: { include: { inventory: true } }, category: true } });
});

exports.updateProduct = (productId, sellerId, payload) => prisma.$transaction(async (tx) => {
  const now = new Date();
  const existingProduct = await tx.product.findFirst({
    where: { id: productId, sellerId },
    include: {
      variants: true,
    },
  });

  if (!existingProduct) {
    return { count: 0 };
  }

  await tx.product.update({
    where: { id: productId },
    data: {
      categoryId: payload.categoryId,
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      basePrice: BigInt(payload.basePrice),
      status: "PENDING",
      updatedAt: now,
    },
  });

  await tx.productImage.deleteMany({ where: { productId } });

  if (payload.images.length) {
    await tx.productImage.createMany({
      data: payload.images.map((image) => ({
        productId,
        url: image.url,
        sortOrder: image.sortOrder || 0,
        createdAt: now,
      })),
    });
  }

  const existingVariantIds = existingProduct.variants.map((variant) => variant.id);
  if (existingVariantIds.length) {
    await tx.inventory.deleteMany({ where: { variantId: { in: existingVariantIds } } });
    await tx.productVariant.deleteMany({ where: { productId } });
  }

  for (const variant of payload.variants) {
    const createdVariant = await tx.productVariant.create({
      data: {
        productId,
        sku: variant.sku,
        variantName: variant.variantName,
        options: variant.options,
        price: BigInt(variant.price),
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.inventory.create({
      data: {
        variantId: createdVariant.id,
        quantity: variant.quantity,
        updatedAt: now,
      },
    });
  }

  await notifyAdmins(tx, {
    title: "Pending product",
    content: `${payload.name || `Product #${productId}`} has been resubmitted to the product review queue.`,
    type: "ADMIN_PENDING_PRODUCT",
    targetType: "PRODUCT",
    targetId: BigInt(productId),
    createdAt: now,
  });

  return { count: 1 };
});
