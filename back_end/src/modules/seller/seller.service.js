const AppError = require("../../utils/app-error");
const sellerRepository = require("./seller.repository");

const getSellerOrThrow = async (accountId) => {
  const seller = await sellerRepository.findSellerByOwner(accountId);
  if (!seller) throw new AppError("Seller profile not found", 404);
  return seller;
};

const getApprovedSellerOrThrow = async (accountId) => {
  const seller = await getSellerOrThrow(accountId);
  if (seller.approvalStatus !== "APPROVED") {
    throw new AppError("Seller account is not approved", 403);
  }
  return seller;
};

exports.getProfile = (accountId) => getSellerOrThrow(accountId);
exports.listOrders = async (accountId) => {
  const seller = await getApprovedSellerOrThrow(accountId);
  return sellerRepository.listOrders(seller.id);
};
exports.listProducts = async (accountId) => {
  const seller = await getApprovedSellerOrThrow(accountId);
  return sellerRepository.listProducts(seller.id);
};
exports.getProduct = async (accountId, productId) => {
  const seller = await getApprovedSellerOrThrow(accountId);
  const product = await sellerRepository.findProductBySeller(seller.id, Number(productId));
  if (!product) throw new AppError("Product not found", 404);
  return product;
};
exports.listAffiliateSettings = async (accountId) => {
  const seller = await getApprovedSellerOrThrow(accountId);
  return sellerRepository.listAffiliateSettings(seller.id);
};
exports.getStats = async (accountId) => {
  const seller = await getApprovedSellerOrThrow(accountId);
  return sellerRepository.getStats(seller.id);
};
exports.upsertProfile = (accountId, payload) => sellerRepository.upsertProfile(accountId, payload);

exports.submitKyc = async (accountId, payload) => {
  const seller = await getSellerOrThrow(accountId);
  return sellerRepository.submitKyc(seller.id, payload);
};

exports.addPaymentAccount = async (accountId, payload) => {
  const seller = await getSellerOrThrow(accountId);
  return sellerRepository.createPaymentAccount(seller.id, payload);
};

exports.upsertProductAffiliateSetting = async (accountId, productId, payload) => {
  const seller = await getApprovedSellerOrThrow(accountId);
  return sellerRepository.upsertProductAffiliateSetting(seller.id, Number(productId), payload);
};

exports.setProductVisibility = async (accountId, productId, payload) => {
  const seller = await getApprovedSellerOrThrow(accountId);

  try {
    return await sellerRepository.setProductVisibility(seller.id, Number(productId), payload.visible);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};
