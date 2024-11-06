const {
  createTextMessage,
  createTemplateMessage,
} = require("../../helpers/messages.helpers");
const { sendMessage } = require("../../helpers/twilio.helpers");
const { findTemplateSid } = require("../../helpers/twilio_account.helpers");

async function handleTemplateMessage({
  contactModel,
  userMessage,
  organizationMessagingServiceSid,
  flowName,
  templateKey,
  templateVariables,
  updateData,
}) {
  if (updateData) {
    await contactModel.updateContact(updateData);
  }
  const { templateSid, templateName } = await findTemplateSid(
    templateKey,
    false
  );
  const responseMessage = createTemplateMessage({
    waId: userMessage.WaId,
    contentSid: templateSid,
    templateVariables,
    messagingServiceSid: organizationMessagingServiceSid,
  });
  await saveAndSendMessage({
    responseMessage,
    userMessage,
    flowName,
    templateName,
    contactModel,
  });
}

async function saveAndSendMessage({
  responseMessage,
  userMessage,
  flowName,
  templateName,
  contactModel,
}) {
  const messageToSave = {
    clientSideTriggered: userMessage.clientSideTriggered,
    trackedFlowId: userMessage.trackedFlowId,
    Body: responseMessage?.body ?? null,
    To: `whatsapp:+${userMessage.WaId}`,
    From: responseMessage.from,
    Direction: "outbound",
    Flow: flowName,
    ContentSID: responseMessage?.contentSid ?? null,
    ContentVariables: responseMessage?.contentVariables ?? null,
    CreatedAt: new Date(),
    Status: "sent",
    SearchableTemplateName: templateName ?? null,
  };
  const insertedId = await contactModel.saveContactMessage(
    userMessage.WaId,
    messageToSave
  );
  const sid = await sendMessage(responseMessage);
  await contactModel.addMessageSid(insertedId, sid);
}
async function runStepBasedFlow2({
  flowConstructorParams,
  flowStep,
  flowName,
}) {
  const { userMessage, contactModel, organizationMessagingServiceSid } =
    flowConstructorParams;
  let flowCompletionStatus = false;
  if (flowStep === 5) {
    const text = "This is the end of the flow!";
    const responseMessage = createTextMessage({
      waId: userMessage.WaId,
      textContent: text,
      messagingServiceSid: organizationMessagingServiceSid,
    });
    await saveAndSendMessage({
      responseMessage,
      userMessage,
      flowName,
      templateName: null,
      contactModel,
    });
    flowCompletionStatus = true;
    return flowCompletionStatus;
  }
  if (flowStep >= 2) {
    const text = `The current flow step is ${flowStep}`;
    const responseMessage = createTextMessage({
      waId: userMessage.WaId,
      textContent: text,
      messagingServiceSid: organizationMessagingServiceSid,
    });
    await saveAndSendMessage({
      responseMessage,
      userMessage,
      flowName,
      templateName: null,
      contactModel,
    });
  } else {
    await handleTemplateMessage({
      contactModel,
      userMessage,
      organizationMessagingServiceSid,
      flowName,
      templateKey: "sample_message_2",
    });
  }
  return flowCompletionStatus;
}

module.exports = {
  runStepBasedFlow2,
};
