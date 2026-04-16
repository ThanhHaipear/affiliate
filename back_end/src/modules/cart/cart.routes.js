const express = require("express");

const controller = require("./cart.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { addItemSchema, updateItemQuantitySchema, checkoutSchema } = require("./cart.schema");

const router = express.Router();

router.use(authenticate, authorize("CUSTOMER"));
router.get("/", controller.getCart);
router.post("/items", validate(addItemSchema), controller.addItem);
router.put("/items/:itemId", validate(updateItemQuantitySchema), controller.updateItemQuantity);
router.delete("/items/:itemId", controller.removeItem);
router.post("/checkout", validate(checkoutSchema), controller.checkout);

module.exports = router;
