const express = require("express");

const controller = require("./upload.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { uploadImageFields } = require("../../middlewares/upload.middleware");

const router = express.Router();

router.post("/images", authenticate, authorize("SELLER", "AFFILIATE", "ADMIN"), uploadImageFields(), controller.uploadImage);

module.exports = router;
