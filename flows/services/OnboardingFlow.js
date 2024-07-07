const {
  createTextMessage,
  createTemplateMessage,
} = require("../helpers/messages.helpers");
const { sendMessage } = require("../helpers/twilio.helpers");
const { updateUser } = require("../helpers/database.helpers");
const { findTemplateSid } = require("../helpers/twilio_account.helpers");
class OnboardingFlow {
  constructor(userInfo, userMessage, mongoClient) {
    this.waId = userInfo.WaId;
    this.messageContent = userMessage?.Body;
    this.mongoClient = mongoClient;
    this.onboardingTexts = {
      1: `Hello!\n\nWelcome to Alix Signposting.\n\nAlix signposts you to local and national help, starting in the region of Cornwall. You can find out more at https://www.projectalix.com/Cornwall\n\nLet's get started:\nPlease enter 'next' to continue.`,
      2: `Step 1 of 4: To begin, what is your name?`, //update name
      3: `Nice to meet you!\nStep 2 of 4: To ensure we have the right information, could you share the name of the organisation you work for?`, //update organization
      4: `Step 3 of 4: Great, to better assist you could you let us know the postcode you will be seeking support around?`, //update postcode
      6: `Thank you for sharing.\nBy continuing you agree to our privacy policy, which can be viewed here:\nhttps://www.projectalix.com/privacy\nDo you agree to proceed with assistance?\nPlease enter 'consent' to continue.`, //opted in, completed_onboarding = true
    };
  }

  async handleFlowStep(flowStep) {
    if (flowStep != 5) {
      const text = this.onboardingTexts[flowStep] || "flow complete";
      const message = createTextMessage(this.waId, text);

      if (flowStep === 3) {
        await this.updateUser({ "username": this.messageContent });
      } else if (flowStep === 4) {
        await this.updateUser({ "organization": this.messageContent });
      } else if (flowStep === 6) {
        await this.updateUser({ "language": this.messageContent });
      } else if (flowStep === 7) {
        await this.updateUser({
          "completed_onboarding": true,
          "opted_in": true,
        });
      }

      await sendMessage(message);
    } else {
      const templateSid = await findTemplateSid("select_language", false);
      const templateMessage = createTemplateMessage(this.waId, templateSid);
      await this.updateUser({ "postcode": this.messageContent });
      await sendMessage(templateMessage);
    }
  }

  async updateUser(updateData) {
    // Assuming updateUser function exists and updates the user in the database
    await updateUser(this.mongoClient, this.waId, updateData);
  }
}

module.exports = {
  OnboardingFlow,
};
