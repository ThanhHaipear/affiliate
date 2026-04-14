const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const productService = require("./product.service");

exports.listProducts = asyncHandler(async (_req, res) => {
  const data = await productService.listProducts();
  successResponse(res, data, "Products loaded");
});

exports.getProduct = asyncHandler(async (req, res) => {
  const data = await productService.getProduct(req.params.productId);
  successResponse(res, data, "Product loaded");
});

exports.createProduct = asyncHandler(async (req, res) => {
  const data = await productService.createProduct(req.user.id, req.validated.body);
  successResponse(res, data, "Product created", 201);
});

exports.updateProduct = asyncHandler(async (req, res) => {
  const data = await productService.updateProduct(req.user.id, req.params.productId, req.validated.body);
  successResponse(res, data, "Product updated");
});
