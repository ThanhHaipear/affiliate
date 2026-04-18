const asyncHandler = require("../utils/async-handler");
const realtimeService = require("./realtime.service");

exports.stream = asyncHandler(async (req, res) => {
  realtimeService.subscribe(req, res);
});
