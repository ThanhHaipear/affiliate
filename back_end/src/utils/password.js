const bcrypt = require("bcryptjs");

exports.hashPassword = (value) => bcrypt.hash(value, 10);
exports.comparePassword = (value, hash) => bcrypt.compare(value, hash);
