const express = require("express");

const controller = require("./payment.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  payOrderSchema,
  createVnpayPaymentSchema,
  vnpayCallbackSchema,
  confirmReceiptSchema,
  refundOrderSchema,
  cancelOrderSchema,
} = require("./payment.schema");

const router = express.Router();

router.get("/vnpay-ipn", controller.handleVnpayIpn);
router.post("/vnpay-return/confirm", validate(vnpayCallbackSchema), controller.confirmVnpayReturn);
router.post("/:orderId/pay", authenticate, authorize("CUSTOMER"), validate(payOrderSchema), controller.payOrder);
router.post("/:orderId/vnpay-url", authenticate, authorize("CUSTOMER"), validate(createVnpayPaymentSchema), controller.createVnpayPaymentUrl);
router.post("/:orderId/cancel", authenticate, authorize("CUSTOMER"), validate(cancelOrderSchema), controller.cancelOrder);
router.post("/:orderId/seller-cancel", authenticate, authorize("SELLER"), validate(cancelOrderSchema), controller.cancelOrderBySeller);
router.post("/:orderId/seller-confirm", authenticate, authorize("SELLER"), validate(confirmReceiptSchema), controller.confirmSellerReceivedMoney);
router.post("/:orderId/refund", authenticate, authorize("CUSTOMER"), validate(refundOrderSchema), controller.refundOrder);

module.exports = router;
