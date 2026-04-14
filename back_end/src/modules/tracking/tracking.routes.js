const express = require("express");

const controller = require("./tracking.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createLinkSchema, revokeLinkSchema, trackClickSchema } = require("./tracking.schema");

const router = express.Router();

router.get("/links", authenticate, authorize("AFFILIATE"), controller.listLinks);
router.post("/links", authenticate, authorize("AFFILIATE"), validate(createLinkSchema), controller.createLink);
router.patch("/links/:linkId/revoke", authenticate, authorize("AFFILIATE"), validate(revokeLinkSchema), controller.revokeLink);
router.post("/clicks", validate(trackClickSchema), controller.trackClick);

module.exports = router;
