const express = require("express");

const controller = require("./auth.controller");
const { validate } = require("../../middlewares/validate.middleware");
const { authenticate } = require("../../middlewares/auth.middleware");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyResetPasswordTokenSchema,
  resetPasswordWithTokenSchema,
  enrollAffiliateSchema,
} = require("./auth.schema");

const router = express.Router();

router.post("/register", validate(registerSchema), controller.register);
router.post("/login", validate(loginSchema), controller.login);
router.post("/refresh-token", validate(refreshSchema), controller.refreshToken);
router.post("/logout", controller.logout);
router.post("/forgot-password", validate(forgotPasswordSchema), controller.forgotPassword);
router.get("/reset-password/verify", validate(verifyResetPasswordTokenSchema), controller.verifyResetPasswordToken);
router.post("/reset-password", validate(resetPasswordWithTokenSchema), controller.resetPasswordWithToken);
router.post("/change-password", authenticate, validate(changePasswordSchema), controller.changePassword);
router.post("/enroll-affiliate", authenticate, validate(enrollAffiliateSchema), controller.enrollAffiliate);

module.exports = router;
