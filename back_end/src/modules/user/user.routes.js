const express = require("express");

const controller = require("./user.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { profileSchema } = require("./user.schema");

const router = express.Router();

router.use(authenticate, authorize("CUSTOMER"));
router.get("/profile", controller.getProfile);
router.put("/profile", validate(profileSchema), controller.updateProfile);

module.exports = router;
