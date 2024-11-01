const express = require("express");
const router = express.Router();
router.post("/", async (req, res, next) => {
  const db = req.app.locals.db;
  let flowCompletionStatus;
  console.log(req.body);
  const {
    userInfo,
    organizationPhoneNumber,
    message,
    flowStep,
    startTime,
    organizationMessagingServiceSid,
  } = req.body;
  res.status(200).json({ message: "Message recieved!" });
});
