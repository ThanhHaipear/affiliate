const express = require("express");

const controller = require("./tracking.controller");
const { authenticate } = require("../../middlewares/auth.middleware");
const { authorize } = require("../../middlewares/role.middleware");
const { validate } = require("../../middlewares/validate.middleware");
const { createLinkSchema, revokeLinkSchema, linkStatusSchema, trackClickSchema } = require("./tracking.schema");

const router = express.Router();

router.get("/links", authenticate, authorize("AFFILIATE"), controller.listLinks);
router.post("/links", authenticate, authorize("AFFILIATE"), validate(createLinkSchema), controller.createLink);
router.patch("/links/:linkId/revoke", authenticate, authorize("AFFILIATE"), validate(revokeLinkSchema), controller.revokeLink);
router.patch("/links/:linkId/unrevoke", authenticate, authorize("AFFILIATE"), validate(revokeLinkSchema), controller.unrevokeLink);
router.get("/links/status/:shortCode", validate(linkStatusSchema), controller.getLinkStatus);
router.post("/clicks", validate(trackClickSchema), controller.trackClick);

module.exports = router;
