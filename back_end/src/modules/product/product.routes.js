const express = require("express");

const controller = require("./product.controller");
const { authenticate, authenticateOptional } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createProductSchema, updateProductSchema, createReviewSchema } = require("./product.schema");

const router = express.Router();

router.get("/", controller.listProducts);
router.get("/categories", controller.listCategories);
router.get("/:productId/reviews", authenticateOptional, controller.listProductReviews);
router.get("/:productId", controller.getProduct);
router.post("/:productId/reviews", authenticate, authorize("CUSTOMER"), validate(createReviewSchema), controller.createProductReview);
router.post("/", authenticate, authorize("SELLER"), validate(createProductSchema), controller.createProduct);
router.put("/:productId", authenticate, authorize("SELLER"), validate(updateProductSchema), controller.updateProduct);

module.exports = router;
