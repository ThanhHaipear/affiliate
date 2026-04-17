const express = require("express");

const controller = require("./seller.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { requireApprovedSeller, requireSellerProfile } = require("../../middlewares/seller.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { upsertProfileSchema, kycSchema, paymentSchema, affiliateSettingSchema } = require("./seller.schema");

const router = express.Router();

router.use(authenticate, requireSellerProfile);
router.get("/profile", controller.getProfile);
router.put("/profile", validate(upsertProfileSchema), controller.upsertProfile);
router.post("/kyc", validate(kycSchema), controller.submitKyc);
router.post("/payment-accounts", validate(paymentSchema), controller.addPaymentAccount);
router.get("/stats", requireApprovedSeller, controller.getStats);
router.get("/orders", requireApprovedSeller, controller.listOrders);
router.get("/products", requireApprovedSeller, controller.listProducts);
router.get("/products/:productId", requireApprovedSeller, controller.getProduct);
router.get("/affiliate-settings", requireApprovedSeller, controller.listAffiliateSettings);
router.put(
  "/products/:productId/affiliate-setting",
  requireApprovedSeller,
  validate(affiliateSettingSchema),
  controller.upsertProductAffiliateSetting,
);

module.exports = router;
