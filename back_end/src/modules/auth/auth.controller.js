const asyncHandler = require("../../utils/async-handler");
const { successResponse } = require("../../utils/api-response");
const authService = require("./auth.service");

exports.register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.validated.body);
  successResponse(res, data, "Registered successfully", 201);
});

exports.login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.validated.body);
  successResponse(res, data, "Login successful");
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const data = await authService.refreshToken(req.validated.body);
  successResponse(res, data, "Token refreshed");
});

exports.logout = asyncHandler(async (_req, res) => {
  const data = await authService.logout();
  successResponse(res, data, "Logout successful");
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const data = await authService.forgotPassword(req.validated.body);
  successResponse(res, data, "Password reset request received");
});

exports.verifyResetPasswordToken = asyncHandler(async (req, res) => {
  const data = await authService.verifyResetPasswordToken(req.validated.query);
  successResponse(res, data, "Reset token is valid");
});

exports.resetPasswordWithToken = asyncHandler(async (req, res) => {
  const data = await authService.resetPasswordWithToken(req.validated.body);
  successResponse(res, data, "Password reset successful");
});

exports.changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword(req.user.id, req.validated.body);
  successResponse(res, data, "Password changed");
});

exports.enrollAffiliate = asyncHandler(async (req, res) => {
  const data = await authService.enrollAffiliate(req.user.id, req.validated.body);
  successResponse(res, data, "Affiliate role enrolled successfully");
});
