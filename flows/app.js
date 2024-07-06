require("dotenv").config();
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const { mongoClient } = require("./config/mongodb.config");
const logger = require("morgan");

const indexRouter = require("./routes/index");
const flowRouter = require("./routes/flow");
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
app.use("/flows", flowRouter);
module.exports = app;
