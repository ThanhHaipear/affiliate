const express = require("express");
const controller = require("./appeal.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const {
  createAppealSchema,
  sendMessageSchema,
  adminReplySchema,
  appealParamsSchema,
} = require("./appeal.schema");

const router = express.Router();

// ── User endpoints (seller / affiliate) ──
router.post("/", authenticate, validate(createAppealSchema), controller.createAppeal);
router.get("/me", authenticate, controller.getMyAppeals);
router.get("/:appealId", authenticate, validate(appealParamsSchema), controller.getAppeal);
router.post("/:appealId/messages", authenticate, validate(sendMessageSchema), controller.sendMessage);

// ── Admin endpoints ──
router.get("/admin/all", authenticate, authorize("ADMIN"), controller.adminGetAllAppeals);
router.post("/:appealId/admin-reply", authenticate, authorize("ADMIN"), validate(adminReplySchema), controller.adminReply);

module.exports = router;
