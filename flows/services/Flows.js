const {
  createTextMessage,
  createTemplateMessage,
} = require("../helpers/messages.helpers");
const { formatTag } = require("../helpers/format.helpers");
const { sendMessage } = require("../helpers/twilio.helpers");
const { updateUser, selectOptions } = require("../helpers/database.helpers");
const { findTemplateSid } = require("../helpers/twilio_account.helpers");
class BaseFlow {
  constructor(db, userInfo, userMessage) {
    this.db = db;
    this.userInfo = userInfo;
    this.waId = userInfo.WaId;
    this.messageContent = userMessage?.Body;
    this.listId = userMessage?.ListId;
  }
}
class OnboardingFlow extends BaseFlow {
  constructor(db, userInfo, userMessage) {
    super(db, userInfo, userMessage);
    this.onboardingTexts = {
      1: `Hello!\n\nWelcome to Alix Signposting.\n\nAlix signposts you to local and national help, starting in the region of Cornwall. You can find out more at https://www.projectalix.com/Cornwall\n\nLet's get started:\nPlease enter 'next' to continue.`,
      2: `Step 1 of 4: To begin, what is your name?`, // update name
      3: `Nice to meet you!\nStep 2 of 4: To ensure we have the right information, could you share the name of the organisation you work for?`, // update organization
      4: `Step 3 of 4: Great, to better assist you could you let us know the postcode you will be seeking support around?`, // update postcode
      6: `Thank you for sharing.\nBy continuing you agree to our privacy policy, which can be viewed here:\nhttps://www.projectalix.com/privacy\nDo you agree to proceed with assistance?\nPlease enter 'consent' to continue.`, // opted in, completed_onboarding = true
    };
  }

  async handleFlowStep(flowStep) {
    let flowCompletionStatus = false;
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
        flowCompletionStatus = true;
      }

      await sendMessage(message);
    } else {
      const templateSid = await findTemplateSid("select_language", false);
      const templateMessage = createTemplateMessage(this.waId, templateSid);
      await this.updateUser({ "postcode": this.messageContent });
      await sendMessage(templateMessage);
    }
    return flowCompletionStatus;
  }

  async updateUser(updateData) {
    // Assuming updateUser function exists and updates the user in the database
    await updateUser(this.db, this.waId, updateData);
  }
}

class SignpostingFlow extends BaseFlow {
  constructor(db, userInfo, userMessage) {
    super(db, userInfo, userMessage);
    this.signpostingTemplates = {};
  }
  async init() {
    this.signpostingTemplates[1] = {
      templateSid: await findTemplateSid("signposting_options_1", false),
      templateVariables: {
        greeting:
          "Welcome, please select a category below to see support options",
      },
    };
    this.signpostingTemplates[2] = {
      templateSid: await findTemplateSid(this.messageContent),
      templateVariables: {
        select_further_options:
          "Thank you, please select a further option from the below",
      },
    };
    this.signpostingTemplates[3] = {
      templateSid: await findTemplateSid("location_choice", false),
      templateVariables: {
        location_choice_message:
          "Thank you, would you like to see local options, national options or both?",
      },
    };
  }

  async handleFlowStep(flowStep, userSelection) {
    console.log("user selection:", userSelection);
    let flowCompletionStatus = false;
    if (flowStep <= 3) {
      await this.init();
      const templateSid = this.signpostingTemplates[flowStep]["templateSid"];
      const templateVariables =
        this.signpostingTemplates[flowStep]["templateVariables"];
      const template = createTemplateMessage(
        this.waId,
        templateSid,
        templateVariables
      );
      await sendMessage(template);
    }
    if (flowStep === 4) {
      const { location, category, page } = userSelection;
      const { postcode, language } = this.userInfo; //eslint-disable-line
      const tag = formatTag(category);
      const pageSize = 5;
      const location_choice = location.toLowerCase();
      const dbResult = await selectOptions(
        this.db,
        tag,
        location_choice,
        page,
        pageSize
      );
      console.log("Final options", dbResult);
      const { result, remaining } = dbResult;
      const moreOptionsAvailable = remaining >= pageSize;
      for (const item of result) {
        const messageContent = JSON.stringify(item);
        console.log("sending message:", messageContent);
        const message = createTextMessage(this.waId, messageContent);
        await sendMessage(message);
      }
    }
    return flowCompletionStatus;
  }
  async sendLastOptionMessage(recipient, moreOptionsAvailable) {
    let message;
    if (moreOptionsAvailable) {
      const contentSid = "HX31992901024acd003249c56f412fba4f";
      message = createTemplateMessage(recipient, contentSid);
    } else {
      const text =
        "Thanks for using the service just now, please text 'hi' to search again";
      message = createTextMessage(recipient, text);
    }
    return message;
  }
}
module.exports = {
  OnboardingFlow,
  SignpostingFlow,
};
