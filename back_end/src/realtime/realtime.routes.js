const express = require("express");

const controller = require("./realtime.controller");

const router = express.Router();

router.get("/stream", controller.stream);

module.exports = router;
