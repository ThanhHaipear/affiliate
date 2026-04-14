const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const cartService = require("./cart.service");

exports.getCart = asyncHandler(async (req, res) => {
  const data = await cartService.getCart(req.user.id);
  successResponse(res, data, "Cart loaded");
});

exports.addItem = asyncHandler(async (req, res) => {
  const data = await cartService.addItem(req.user.id, req.validated.body);
  successResponse(res, data, "Item added to cart", 201);
});

exports.updateItemQuantity = asyncHandler(async (req, res) => {
  const data = await cartService.updateItemQuantity(req.user.id, req.params.itemId, req.validated.body);
  successResponse(res, data, "Cart item quantity updated");
});

exports.removeItem = asyncHandler(async (req, res) => {
  const data = await cartService.removeItem(req.user.id, req.params.itemId);
  successResponse(res, data, "Item removed from cart");
});

exports.checkout = asyncHandler(async (req, res) => {
  const data = await cartService.checkout(req.user.id, req.validated.body);
  successResponse(res, data, "Checkout created order", 201);
});
