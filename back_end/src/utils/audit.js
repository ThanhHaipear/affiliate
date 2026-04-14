exports.buildAuditData = (req) => ({
  ip: req.ip,
  userAgent: req.headers["user-agent"] || null
});
