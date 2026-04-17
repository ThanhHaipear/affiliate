const express = require("express");

const controller = require("./affiliate.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { requireAffiliateProfile, requireApprovedAffiliate } = require("../../middlewares/affiliate.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { profileSchema, kycSchema, channelSchema, paymentSchema } = require("./affiliate.schema");

const router = express.Router();

router.use(authenticate, requireAffiliateProfile);
router.get("/profile", controller.getProfile);
router.put("/profile", validate(profileSchema), controller.updateProfile);
router.post("/kyc", validate(kycSchema), controller.submitKyc);
router.post("/channels", validate(channelSchema), controller.addChannel);
router.post("/payment-accounts", validate(paymentSchema), controller.addPaymentAccount);
router.get("/stats", requireApprovedAffiliate, controller.getStats);

module.exports = router;
