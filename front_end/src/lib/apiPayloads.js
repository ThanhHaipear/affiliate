function slugify(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildProductPayload(values = {}, options = {}) {
  const rawCategoryId = values.categoryId ?? options.categoryId;
  const parsedCategoryId = rawCategoryId === undefined || rawCategoryId === null || rawCategoryId === ""
    ? undefined
    : Number(rawCategoryId);
  const imageUrls = values.imageUrls || options.imageUrls || [];

  return {
    categoryId: Number.isInteger(parsedCategoryId) && parsedCategoryId > 0 ? parsedCategoryId : undefined,
    name: values.name,
    slug: values.slug || slugify(values.name),
    description: values.description || "",
    basePrice: Number(values.price || 0),
    images: imageUrls.map((url, index) => ({ url, sortOrder: index })),
    variants: [
      {
        sku: values.sku || slugify(values.name).toUpperCase(),
        variantName: values.variantName || "Mac dinh",
        options: {},
        price: Number(values.price || 0),
        quantity: Number(values.stock || 0),
      },
    ],
  };
}

function buildCheckoutPayload(values = {}) {
  return {
    addressId: Number(values.addressId),
    selectedItemIds: (values.selectedItemIds || []).map((itemId) => Number(itemId)),
    buyerName: values.buyerName || "",
    buyerEmail: values.buyerEmail || "",
    buyerPhone: values.buyerPhone || "",
    shippingFee: Number(values.shippingFee || 0),
    discountAmount: Number(values.discountAmount || 0),
    shippingMethod: values.shippingMethod || "STANDARD",
    paymentMethod: values.paymentMethod || "COD",
  };
}

export { buildCheckoutPayload, buildProductPayload, slugify };
