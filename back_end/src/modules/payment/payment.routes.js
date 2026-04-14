const express = require("express");

const controller = require("./payment.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { payOrderSchema, confirmReceiptSchema, refundOrderSchema, cancelOrderSchema } = require("./payment.schema");

const router = express.Router();

router.post("/:orderId/pay", authenticate, validate(payOrderSchema), controller.payOrder);
router.post("/:orderId/cancel", authenticate, validate(cancelOrderSchema), controller.cancelOrder);
router.post("/:orderId/seller-confirm", authenticate, authorize("SELLER"), validate(confirmReceiptSchema), controller.confirmSellerReceivedMoney);
router.post("/:orderId/refund", authenticate, validate(refundOrderSchema), controller.refundOrder);

module.exports = router;
