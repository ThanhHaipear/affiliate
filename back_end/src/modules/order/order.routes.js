const express = require("express");

const controller = require("./order.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");

const router = express.Router();

router.use(authenticate, authorize("CUSTOMER"));
router.get("/", controller.listOrders);
router.get("/:orderId", controller.getOrder);

module.exports = router;
