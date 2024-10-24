const express = require("express");
const router = express.Router();
const cronJobController = require("../controllers/cronJobController");
const { buildFlowTriggerRequest } = require("../middleware/customBodyFields");
router.post(
  "/survey-reminder",
  buildFlowTriggerRequest,
  cronJobController.sendSurveyReminder
);

module.exports = router;
