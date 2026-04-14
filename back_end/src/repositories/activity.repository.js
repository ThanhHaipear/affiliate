const prisma = require("../config/prisma");

exports.createActivityLog = (data, tx = prisma) => tx.activityLog.create({ data });
exports.createNotification = (data, tx = prisma) => tx.notification.create({ data });
