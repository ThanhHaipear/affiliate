const express = require("express");

const controller = require("./payout.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createBatchSchema, processBatchSchema } = require("./payout.schema");

const router = express.Router();

router.use(authenticate, authorize("ADMIN"));
router.get("/", controller.listBatches);
router.post("/", validate(createBatchSchema), controller.createBatch);
router.post("/:batchId/process", validate(processBatchSchema), controller.processBatch);

module.exports = router;
