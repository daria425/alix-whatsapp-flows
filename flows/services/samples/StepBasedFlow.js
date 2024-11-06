const { BaseFlow } = require("../BaseFlow");
const { createTextMessage } = require("../../helpers/messages.helpers");
class StepBasedFlow extends BaseFlow {
  static FLOW_NAME = "sample";
  constructor({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  }) {
    super({
      userInfo,
      userMessage,
      contactModel,
      organizationPhoneNumber,
      organizationMessagingServiceSid,
    });
  }
  async handleTemplateMessage({ templateKey, templateVariables, updateData }) {
    if (updateData) {
      await this.updateUser(updateData);
    }
    await this.saveAndSendTemplateMessage({
      templateKey,
      templateVariables,
      flowName: StepBasedFlow.FLOW_NAME,
    });
  }

  async handleFlowStep(flowStep) {
    let flowCompletionStatus = false;
    if (flowStep === 5) {
      const text = "This is the end of the flow!";
      const textMessage = createTextMessage({
        waId: this.WaId,
        textContent: text,
        messagingServiceSid: this.messagingServiceSid,
      });
      await this.saveAndSendTextMessage(textMessage, StepBasedFlow.FLOW_NAME);
      flowCompletionStatus = true;
      return flowCompletionStatus;
    }
    if (flowStep >= 2) {
      const text = `The current flow step is ${flowStep}`;
      const textMessage = createTextMessage({
        waId: this.WaId,
        textContent: text,
        messagingServiceSid: this.messagingServiceSid,
      });
      await this.saveAndSendTextMessage(textMessage, StepBasedFlow.FLOW_NAME);
    } else {
      await this.handleTemplateMessage({ templateKey: "sample_message" });
    }
    return flowCompletionStatus;
  }
}

module.exports = {
  StepBasedFlow,
};
