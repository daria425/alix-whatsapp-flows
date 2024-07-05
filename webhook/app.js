require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const { mongoClient } = require("./config/mongodb.config");
const indexRouter = require("./routes/index");
const webhookRouter = require("./routes/webhook");

const app = express();
mongoClient
  .connect()
  .then((client) => {
    app.locals.mongoClient = client;
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/", indexRouter);
app.use("/webhook", webhookRouter);

process.on("SIGINT", async () => {
  if (app.locals.mongoClient) {
    await app.locals.mongoClient.close();
    console.log("MongoDB connection closed due to app termination");
  }
  process.exit(0);
});

process.on("SIGTERM", async () => {
  if (app.locals.mongoClient) {
    await app.locals.mongoClient.close();
    console.log("MongoDB connection closed due to app termination");
  }
  process.exit(0);
});
module.exports = app;
