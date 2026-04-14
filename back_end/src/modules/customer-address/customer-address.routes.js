const express = require("express");

const controller = require("./customer-address.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createAddressSchema, updateAddressSchema, addressIdSchema } = require("./customer-address.schema");

const router = express.Router();

router.use(authenticate);
router.get("/", controller.listAddresses);
router.post("/", validate(createAddressSchema), controller.createAddress);
router.put("/:addressId", validate(updateAddressSchema), controller.updateAddress);
router.patch("/:addressId/default", validate(addressIdSchema), controller.setDefaultAddress);
router.delete("/:addressId", validate(addressIdSchema), controller.deleteAddress);

module.exports = router;
