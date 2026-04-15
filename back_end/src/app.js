const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const env = require("./config/env");
const routes = require("./routes");
const { notFoundHandler, errorHandler } = require("./middlewares/error.middleware");

const app = express();

const allowedOrigins = env.corsOrigin
  ? env.corsOrigin.split(",").map((origin) => origin.trim()).filter(Boolean)
  : [];

const privateNetworkOriginPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/i;

app.use(
  cors({
    origin(origin, callback) {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (!allowedOrigins.length && privateNetworkOriginPattern.test(origin))
      ) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Affiliate marketplace backend is running."
  });
});

app.use("/api", routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
