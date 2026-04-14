const jwt = require("jsonwebtoken");
const env = require("../config/env");

exports.signAccessToken = (payload) => jwt.sign(payload, env.jwtAccessSecret, { expiresIn: env.jwtAccessExpiresIn });
exports.signRefreshToken = (payload) => jwt.sign(payload, env.jwtRefreshSecret, { expiresIn: env.jwtRefreshExpiresIn });
exports.verifyAccessToken = (token) => jwt.verify(token, env.jwtAccessSecret);
exports.verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);
