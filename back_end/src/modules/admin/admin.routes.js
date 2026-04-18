const express = require("express");

const controller = require("./admin.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  reviewSchema,
  lockAccountSchema,
  accountActionParamsSchema,
  productActionParamsSchema,
  productVisibilitySchema,
  accountListQuerySchema,
  adminProductsQuerySchema,
  adminOrdersQuerySchema,
  fraudAlertsQuerySchema,
  affiliateLinksQuerySchema,
  affiliateLinkActionParamsSchema,
  platformFeeSchema,
  refundReviewSchema,
  withdrawalConfigSchema,
} = require("./admin.schema");

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));
router.get("/dashboard", controller.getDashboard);
router.get("/accounts", validate(accountListQuerySchema), controller.getAccounts);
router.get("/products", validate(adminProductsQuerySchema), controller.getProducts);
router.patch("/accounts/:accountId/lock", validate(lockAccountSchema), controller.lockAccount);
router.patch("/accounts/:accountId/unlock", validate(accountActionParamsSchema), controller.unlockAccount);
router.get("/orders", validate(adminOrdersQuerySchema), controller.getOrders);
router.get("/financial-stats", validate(adminOrdersQuerySchema), controller.getFinancialStats);
router.get("/fraud-alerts", validate(fraudAlertsQuerySchema), controller.getFraudAlerts);
router.get("/affiliate-links", validate(affiliateLinksQuerySchema), controller.getAffiliateLinks);
router.get("/settings", controller.getPlatformSettings);
router.put("/settings/platform-fee", validate(platformFeeSchema), controller.updatePlatformFee);
router.put("/settings/withdrawal-config", validate(withdrawalConfigSchema), controller.updateWithdrawalConfig);
router.get("/products/:productId", validate(productActionParamsSchema), controller.getProduct);
router.patch("/products/:productId/visibility", validate(productVisibilitySchema), controller.setProductVisibility);
router.patch("/sellers/:sellerId/review", validate(reviewSchema), controller.reviewSeller);
router.patch("/affiliates/:affiliateId/review", validate(reviewSchema), controller.reviewAffiliate);
router.patch("/products/:productId/review", validate(reviewSchema), controller.reviewProduct);
router.patch("/product-affiliate-settings/:settingId/review", validate(reviewSchema), controller.reviewProductAffiliate);
router.patch("/refunds/:refundId/review", validate(refundReviewSchema), controller.reviewRefund);
router.patch("/affiliate-links/:linkId/revoke", validate(affiliateLinkActionParamsSchema), controller.revokeAffiliateLink);
router.patch("/affiliate-links/:linkId/unrevoke", validate(affiliateLinkActionParamsSchema), controller.unrevokeAffiliateLink);

module.exports = router;
