const express = require("express");
const router = express.Router();
const { listTemplates } = require("../helpers/twilio_account.helpers");
router.get("/templates", async (req, res, next) => {
  const templates = await listTemplates();
  res.status(200).send(templates);
});

module.exports = router;
