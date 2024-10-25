const express = require("express");
const router = express.Router();
const cronJobController = require("../controllers/cronJobController");
const { buildFlowTriggerRequest } = require("../middleware/customBodyFields");
//cron job needs to send
/*
{
    "organizationPhoneNumber": "whatsapp:+442078705932",
    "flowName":"survey"
} and organizationId in query params
*/
router.post(
  "/survey-reminder",
  buildFlowTriggerRequest,
  cronJobController.sendSurveyReminder
);

module.exports = router;
