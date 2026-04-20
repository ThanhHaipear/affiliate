const AppError = require("../../utils/app-error");
const prisma = require("../../config/prisma");
const productRepository = require("./product.repository");

const getSellerOrThrow = async (accountId) => {
  const seller = await prisma.seller.findFirst({ where: { ownerAccountId: accountId } });
  if (!seller) throw new AppError("Seller not found", 404);
  return seller;
};

const ensureApprovedSeller = (seller) => {
  if (seller.approvalStatus !== "APPROVED") {
    throw new AppError("Shop is not approved yet, product cannot be submitted for review", 403);
  }
};

exports.listProducts = () => productRepository.listApprovedProducts();
exports.listCategories = () => productRepository.listCategories();

exports.getProduct = async (productId) => {
  const product = await productRepository.findApprovedProductById(Number(productId));
  if (!product) throw new AppError("Product not found", 404);
  return product;
};

exports.listProductReviews = async (productId, viewer = null) => {
  const product = await productRepository.findApprovedProductById(Number(productId));
  if (!product) throw new AppError("Product not found", 404);
  return productRepository.listProductReviews(Number(productId), viewer);
};

exports.createProductReview = async (accountId, productId, payload) => {
  const product = await productRepository.findApprovedProductById(Number(productId));
  if (!product) throw new AppError("Product not found", 404);
  return productRepository.createProductReview(accountId, Number(productId), payload);
};

exports.createProduct = async (accountId, payload) => {
  const seller = await getSellerOrThrow(accountId);
  ensureApprovedSeller(seller);
  return productRepository.createProduct(seller.id, payload);
};

exports.updateProduct = async (accountId, productId, payload) => {
  const seller = await getSellerOrThrow(accountId);
  ensureApprovedSeller(seller);
  const result = await productRepository.updateProduct(Number(productId), seller.id, payload);
  if (!result.count) throw new AppError("Product not found", 404);
  return productRepository.findProductById(Number(productId));
};
