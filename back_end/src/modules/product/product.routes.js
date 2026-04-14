const express = require("express");

const controller = require("./product.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createProductSchema } = require("./product.schema");

const router = express.Router();

router.get("/", controller.listProducts);
router.get("/:productId", controller.getProduct);
router.post("/", authenticate, authorize("SELLER"), validate(createProductSchema), controller.createProduct);
router.put("/:productId", authenticate, authorize("SELLER"), validate(createProductSchema), controller.updateProduct);

module.exports = router;
