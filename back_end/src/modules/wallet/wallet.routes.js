const express = require("express");

const controller = require("./wallet.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");

const router = express.Router();

router.use(authenticate, authorize("AFFILIATE", "SELLER", "ADMIN"));
router.get("/me", controller.getMyWallets);

module.exports = router;
