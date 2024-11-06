const {
  createTextMessage,
  createTemplateMessage,
} = require("../helpers/messages.helpers");
const { sendMessage } = require("../helpers/twilio.helpers");
const { findTemplateSid } = require("../helpers/twilio_account.helpers");
class BaseFlow {
  constructor({
    userInfo,
    userMessage = {},
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  }) {
    this.userInfo = userInfo;
    this.WaId = userInfo.WaId;
    this.userMessage = userMessage;
    this.messageContent = userMessage?.Body;
    this.buttonPayload = userMessage?.ButtonPayload ?? "-";
    this.listId = userMessage?.ListId;
    this.contactModel = contactModel;
    this.organizationPhoneNumber = organizationPhoneNumber;
    this.messagingServiceSid = organizationMessagingServiceSid;
    this.trackedFlowId = userMessage.trackedFlowId;
    this.clientSideTriggered = userMessage.clientSideTriggered;
  }

  async updateUser(updateData) {
    await this.contactModel.updateContact(this.WaId, updateData);
  }

  async createErrorMessage(recipient) {
    const text =
      "An unexpected error occurred, please text 'hi' to search again";
    const message = createTextMessage({
      waId: recipient,
      textContent: text,
      messagingServiceSid: this.messagingServiceSid,
    });
    return message;
  }
  async saveResponseMessage({ message, flowName, templateName }) {
    //OUTBOUND MESSAGE
    const messageToSave = {
      clientSideTriggered: this.clientSideTriggered,
      trackedFlowId: this.trackedFlowId,
      Body: message?.body ?? null,
      To: `whatsapp:+${this.WaId}`,
      From: message.from,
      Direction: "outbound",
      Flow: flowName,
      ContentSID: message?.contentSid ?? null,
      ContentVariables: message?.contentVariables ?? null,
      CreatedAt: new Date(),
      Status: "sent",
      SearchableTemplateName: templateName ?? null,
    };
    const insertedId = await this.contactModel.saveContactMessage(
      this.WaId,
      messageToSave
    );
    return insertedId;
  }
  async updateResponse(messageId, sid) {
    await this.contactModel.addMessageSid(messageId, sid);
  }
  async saveAndSendTextMessage(message, flowName) {
    const insertedId = await this.saveResponseMessage({ message, flowName });
    const sid = await sendMessage(message);
    await this.updateResponse(insertedId, sid);
  }

  async saveAndSendTemplateMessage({
    templateKey,
    templateVariables,
    flowName,
  }) {
    const { templateSid, templateName } = await findTemplateSid(
      templateKey,
      false
    );
    const templateMessage = createTemplateMessage({
      waId: this.WaId,
      contentSid: templateSid,
      templateVariables,
      messagingServiceSid: this.messagingServiceSid,
    });
    const insertedId = await this.saveResponseMessage({
      message: templateMessage,
      flowName,
      templateName,
    });
    const sid = await sendMessage(templateMessage);
    await this.updateResponse(insertedId, sid);
  }
}

module.exports = {
  BaseFlow,
};
