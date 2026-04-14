const express = require("express");

const controller = require("./wallet.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.get("/me", controller.getMyWallets);

module.exports = router;
