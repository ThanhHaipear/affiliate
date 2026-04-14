const express = require("express");

const controller = require("./commission.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.get("/me", controller.listMyCommissions);

module.exports = router;
