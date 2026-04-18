const prisma = require("../../config/prisma");
const AppError = require("../../utils/app-error");
const { notifyAdmins } = require("../../utils/admin-notifications");

const approvedSellerWhere = {
  seller: {
    approvalStatus: "APPROVED",
    lockedAt: null,
  },
};

const ACTIVE_SOLD_ORDER_STATUSES = ["PAID", "PROCESSING", "COMPLETED"];

async function attachCommerceStats(products = []) {
  if (!products.length) {
    return products;
  }

  const productIds = products.map((product) => product.id);
  const [soldAggregates, reviewAggregates] = await Promise.all([
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
        order: {
          status: { in: ACTIVE_SOLD_ORDER_STATUSES },
        },
      },
      _sum: {
        quantity: true,
      },
    }),
    prisma.productReview.groupBy({
      by: ["productId"],
      where: {
        productId: { in: productIds },
      },
      _count: {
        _all: true,
      },
      _avg: {
        rating: true,
      },
    }),
  ]);

  const soldByProductId = new Map(
    soldAggregates.map((row) => [row.productId, Number(row._sum.quantity || 0)]),
  );
  const reviewByProductId = new Map(
    reviewAggregates.map((row) => [
      row.productId,
      {
        reviewCount: Number(row._count?._all || 0),
        ratingAverage: row._avg?.rating == null ? null : Number(row._avg.rating),
      },
    ]),
  );

  return products.map((product) => {
    const reviewStats = reviewByProductId.get(product.id) || {};

    return {
      ...product,
      soldCount: soldByProductId.get(product.id) || 0,
      reviewCount: reviewStats.reviewCount || 0,
      ratingAverage: reviewStats.ratingAverage ?? null,
    };
  });
}

exports.listApprovedProducts = async () => {
  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      sellerHiddenAt: null,
      lockedAt: null,
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

  return attachCommerceStats(products);
};

exports.findApprovedProductById = async (id) => {
  const product = await prisma.product.findFirst({
    where: {
      id,
      status: "APPROVED",
      sellerHiddenAt: null,
      lockedAt: null,
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

  if (!product) {
    return null;
  }

  const [enrichedProduct] = await attachCommerceStats([product]);
  return enrichedProduct;
};

exports.listProductReviews = async (productId, viewer = null) => {
  const [reviews, summary, hasCompletedPurchase, hasReviewed] = await Promise.all([
    prisma.productReview.findMany({
      where: { productId },
      include: {
        account: {
          include: {
            customerProfile: true,
          },
        },
        orderItem: {
          include: {
            order: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productReview.aggregate({
      where: { productId },
      _count: { _all: true },
      _avg: { rating: true },
    }),
    viewer?.id && viewer?.roles?.includes("CUSTOMER")
      ? prisma.orderItem.findFirst({
          where: {
            productId,
            order: {
              buyerId: viewer.id,
              status: "COMPLETED",
            },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    viewer?.id && viewer?.roles?.includes("CUSTOMER")
      ? prisma.productReview.findFirst({
          where: {
            productId,
            accountId: viewer.id,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const canCheckReviewEligibility = Boolean(viewer?.id && viewer?.roles?.includes("CUSTOMER"));
  const viewerReview = canCheckReviewEligibility
    ? {
        hasPurchased: Boolean(hasCompletedPurchase),
        hasReviewed: Boolean(hasReviewed),
        canReview: Boolean(hasCompletedPurchase) && !Boolean(hasReviewed),
        reason: Boolean(hasReviewed)
          ? "Bạn đã đánh giá sản phẩm này rồi."
          : Boolean(hasCompletedPurchase)
            ? null
            : "Chỉ customer đã mua và hoàn tất đơn mới được đánh giá.",
      }
    : null;

  return {
    summary: {
      reviewCount: Number(summary._count?._all || 0),
      ratingAverage: summary._avg?.rating == null ? null : Number(summary._avg.rating),
    },
    items: reviews.map((review) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment || "",
      createdAt: review.createdAt,
      reviewerName:
        review.account?.customerProfile?.fullName ||
        review.account?.email ||
        `Customer #${review.accountId}`,
      orderCode: review.orderItem?.order?.orderCode || null,
    })),
    viewer: viewerReview,
  };
};

exports.createProductReview = async (accountId, productId, payload) => {
  const existingReview = await prisma.productReview.findFirst({
    where: {
      accountId,
      productId,
      orderItem: {
        order: {
          buyerId: accountId,
          status: "COMPLETED",
        },
      },
    },
  });

  if (existingReview) {
    throw new AppError("You have already reviewed this product", 409);
  }

  const eligibleOrderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      productReview: null,
      order: {
        buyerId: accountId,
        status: "COMPLETED",
      },
    },
    include: {
      order: true,
    },
    orderBy: {
      order: {
        createdAt: "desc",
      },
    },
  });

  if (!eligibleOrderItem) {
    throw new AppError("You can only review products from completed purchases", 403);
  }

  const now = new Date();
  const review = await prisma.productReview.create({
    data: {
      productId,
      accountId,
      orderItemId: eligibleOrderItem.id,
      rating: payload.rating,
      comment: payload.comment || null,
      createdAt: now,
      updatedAt: now,
    },
  });

  return prisma.productReview.findUnique({
    where: { id: review.id },
    include: {
      account: {
        include: {
          customerProfile: true,
        },
      },
      orderItem: {
        include: {
          order: true,
        },
      },
    },
  });
};

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
      variants: {
        include: {
          inventory: true,
          _count: {
            select: {
              orderItems: true,
              cartItems: true,
              inventoryTransactions: true,
            },
          },
        },
      },
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
      reviewedBy: null,
      reviewedAt: null,
      rejectReason: null,
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

  const existingVariants = [...existingProduct.variants].sort((left, right) => left.id - right.id);

  for (let index = 0; index < payload.variants.length; index += 1) {
    const variant = payload.variants[index];
    const currentVariant = existingVariants[index];

    if (currentVariant) {
      await tx.productVariant.update({
        where: { id: currentVariant.id },
        data: {
          sku: variant.sku,
          variantName: variant.variantName,
          options: variant.options,
          price: BigInt(variant.price),
          status: "ACTIVE",
          updatedAt: now,
        },
      });

      if (currentVariant.inventory) {
        await tx.inventory.update({
          where: { variantId: currentVariant.id },
          data: {
            quantity: variant.quantity,
            updatedAt: now,
          },
        });
      } else {
        await tx.inventory.create({
          data: {
            variantId: currentVariant.id,
            quantity: variant.quantity,
            updatedAt: now,
          },
        });
      }

      continue;
    }

    const createdVariant = await tx.productVariant.create({
      data: {
        productId,
        sku: variant.sku,
        variantName: variant.variantName,
        options: variant.options,
        price: BigInt(variant.price),
        status: "ACTIVE",
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

  const surplusVariants = existingVariants.slice(payload.variants.length);
  for (const variant of surplusVariants) {
    const hasReferences =
      variant._count.orderItems > 0 ||
      variant._count.cartItems > 0 ||
      variant._count.inventoryTransactions > 0;

    if (hasReferences) {
      await tx.productVariant.update({
        where: { id: variant.id },
        data: {
          status: "INACTIVE",
          updatedAt: now,
        },
      });

      if (variant.inventory) {
        await tx.inventory.update({
          where: { variantId: variant.id },
          data: {
            quantity: 0,
            reservedQuantity: 0,
            updatedAt: now,
          },
        });
      }

      continue;
    }

    if (variant.inventory) {
      await tx.inventory.delete({
        where: { variantId: variant.id },
      });
    }

    await tx.productVariant.delete({
      where: { id: variant.id },
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
