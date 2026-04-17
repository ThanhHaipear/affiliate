const express = require("express");

const controller = require("./order.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");

const router = express.Router();

router.use(authenticate);
router.get("/", authorize("CUSTOMER"), controller.listOrders);
router.get("/:orderId", authorize("CUSTOMER", "SELLER"), controller.getOrder);

module.exports = router;
