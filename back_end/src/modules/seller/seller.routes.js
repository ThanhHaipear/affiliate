const express = require("express");

const controller = require("./seller.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { upsertProfileSchema, kycSchema, paymentSchema, affiliateSettingSchema } = require("./seller.schema");

const router = express.Router();

router.use(authenticate, authorize("SELLER"));
router.get("/profile", controller.getProfile);
router.get("/stats", controller.getStats);
router.get("/products", controller.listProducts);
router.get("/products/:productId", controller.getProduct);
router.get("/affiliate-settings", controller.listAffiliateSettings);
router.put("/profile", validate(upsertProfileSchema), controller.upsertProfile);
router.post("/kyc", validate(kycSchema), controller.submitKyc);
router.post("/payment-accounts", validate(paymentSchema), controller.addPaymentAccount);
router.put("/products/:productId/affiliate-setting", validate(affiliateSettingSchema), controller.upsertProductAffiliateSetting);

module.exports = router;
