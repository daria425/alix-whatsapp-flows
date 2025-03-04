require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const indexRouter = require("./routes/index");
const webhookRouter = require("./routes/webhook");
const statusCallbackRouter = require("./routes/status_callback");
const cronRouter = require("./routes/cron");
const healthRouter = require("./routes/health");
const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", indexRouter);
app.use("/webhook", webhookRouter);
app.use("/callback", statusCallbackRouter);
app.use("/cron", cronRouter);
app.use("/health", healthRouter);
module.exports = app;
