const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const walletService = require("./wallet.service");

exports.getMyWallets = asyncHandler(async (req, res) => {
  const data = await walletService.getMyWallets(req.user.id, req.user.roles);
  successResponse(res, data, "Wallets loaded");
});
