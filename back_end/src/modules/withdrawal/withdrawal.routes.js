const express = require("express");

const controller = require("./withdrawal.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { requestWithdrawalSchema, reviewWithdrawalSchema, adminListWithdrawalsSchema } = require("./withdrawal.schema");

const router = express.Router();

router.use(authenticate);
router.get("/me/context", authorize("AFFILIATE", "SELLER"), controller.getMyWithdrawalContext);
router.get("/me", authorize("AFFILIATE", "SELLER"), controller.listMyWithdrawals);
router.post("/", authorize("AFFILIATE", "SELLER"), validate(requestWithdrawalSchema), controller.requestWithdrawal);
router.get("/pending/list", authorize("ADMIN"), controller.listPendingWithdrawals);
router.get("/admin/list", authorize("ADMIN"), validate(adminListWithdrawalsSchema), controller.listAdminWithdrawals);
router.get("/admin/summary", authorize("ADMIN"), controller.getAdminWithdrawalSummary);
router.patch("/:withdrawalId/review", authorize("ADMIN"), validate(reviewWithdrawalSchema), controller.reviewWithdrawal);

module.exports = router;
