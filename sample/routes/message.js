const express = require("express");
const router = express.Router();
const { findTemplateSid } = require("../helpers/templates.helpers");
const {
  createTemplateMessage,
  sendMessage,
} = require("../helpers/messages.helpers");
const { DatabaseService } = require("../services/database.service");
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
  const flow = req.params.flowName;
  const databaseService = new DatabaseService(
    db,
    startTime,
    organizationPhoneNumber
  );
  const { templateSid, templateName } = await findTemplateSid("sample_message");
  const templateMessage = createTemplateMessage({
    waId: message.WaId,
    contentSid: templateSid,
    templateVariables: {},
    messagingServiceSid: organizationMessagingServiceSid,
  });
  const insertedId = await databaseService.saveResponseMessage({
    message,
    flowName,
    templateName,
  });
  const sid = await sendMessage(templateMessage);
  await databaseService.updateResponseMessageWithSid(insertedId, sid);
  if (message?.ButtonPayload.split("_")[0] === "false") {
    //User has selected "No"
    flowCompletionStatus = true;
  }
  return flowCompletionStatus;
});
