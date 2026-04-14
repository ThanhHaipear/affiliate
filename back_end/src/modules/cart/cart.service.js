const AppError = require("../../utils/app-error");
const cartRepository = require("./cart.repository");

exports.getCart = (accountId) => cartRepository.getCart(accountId);
exports.addItem = async (accountId, payload) => {
  try {
    return await cartRepository.addItem(accountId, payload);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};
exports.updateItemQuantity = async (accountId, itemId, payload) => {
  try {
    return await cartRepository.updateItemQuantity(accountId, itemId, payload.quantity);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};
exports.removeItem = async (accountId, itemId) => {
  try {
    return await cartRepository.removeItem(accountId, itemId);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};
exports.checkout = async (accountId, payload) => {
  try {
    return await cartRepository.checkout(accountId, payload);
  } catch (error) {
    throw new AppError(error.message, 400);
  }
};
