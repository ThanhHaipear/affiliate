const express = require("express");

const controller = require("./notification.controller");
const { authenticate } = require("../../middlewares/auth.middleware");

const router = express.Router();

router.use(authenticate);
router.get("/", controller.listNotifications);
router.post("/read-all", controller.markAllNotificationsAsRead);
router.post("/:notificationId/read", controller.markNotificationAsRead);

module.exports = router;
