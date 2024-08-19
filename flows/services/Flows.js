const {
  createTextMessage,
  createTemplateMessage,
} = require("../helpers/messages.helpers");
const { formatTag } = require("../helpers/format.helpers");
const { sendMessage } = require("../helpers/twilio.helpers");
const { updateUser, getUserDetail } = require("../helpers/database.helpers");
const { findTemplateSid } = require("../helpers/twilio_account.helpers");
const { logMessageAsJson } = require("../helpers/logging.helpers");
class BaseFlow {
  constructor(db, userInfo, userMessage, contactModel) {
    this.db = db;
    this.userInfo = userInfo;
    this.waId = userInfo.WaId;
    this.messageContent = userMessage?.Body;
    this.listId = userMessage?.ListId;
    this.contactModel = contactModel;
  }
  async createErrorMessage(recipient) {
    const text =
      "An unexpected error occurred, please text 'hi' to search again";
    const message = createTextMessage(recipient, text);
    return message;
  }
}
class OnboardingFlow extends BaseFlow {
  constructor(db, userInfo, userMessage, contactModel) {
    super(db, userInfo, userMessage, contactModel);
    this.onboardingTexts = {
      1: `Hello!\n\nWelcome to Alix Signposting.\n\nAlix signposts you to local and national help, starting in the region of Cornwall. You can find out more at https://www.projectalix.com/Cornwall\n\nLet's get started:\nPlease enter 'next' to continue.`,
      2: `Step 1 of 5: To begin, what is your name?`, // update name
      3: `Nice to meet you!\nStep 2 of 5: To ensure we have the right information, could you share the name of the organisation you work for?`, // update organization
      5: `Step 4 of 5: Great, to better assist you could you let us know the postcode you will be seeking support around?`,
      7: `Thank you for sharing.\nBy continuing you agree to our privacy policy, which can be viewed here:\nhttps://www.projectalix.com/privacy\nDo you agree to proceed with assistance?\nPlease enter 'consent' to continue.`, // opted in, completed_onboarding = true
    };
  }

  async handleFlowStep(flowStep) {
    let flowCompletionStatus = false;
    if (flowStep != 6 && flowStep != 4) {
      const text =
        this.onboardingTexts[flowStep] ||
        "Thank you for registering with us. Please message 'hi' to begin a search";
      const message = createTextMessage(this.waId, text);

      if (flowStep === 3) {
        await this.updateUser({ "username": this.messageContent });
      } else if (flowStep === 5) {
        await this.updateUser({ "region": this.messageContent });
      } else if (flowStep === 7) {
        await this.updateUser({ "language": this.messageContent });
      } else if (flowStep === 8) {
        await this.updateUser({
          "completed_onboarding": true,
          "opted_in": true,
        });
        flowCompletionStatus = true;
      }
      await sendMessage(message);
    } else {
      if (flowStep === 6) {
        const templateSid = await findTemplateSid("select_language", false);
        const templateMessage = createTemplateMessage(this.waId, templateSid);
        await this.updateUser({ "postcode": this.messageContent });
        await sendMessage(templateMessage);
      } else if (flowStep === 4) {
        const templateSid = await findTemplateSid("select_region", false);
        const templateVariables = {
          select_region_message: `Step 3 of 5: Could you let us know the region you will be seeking support around?`,
        };
        await this.updateUser({ "organization": this.messageContent });
        const templateMessage = createTemplateMessage(
          this.waId,
          templateSid,
          templateVariables
        );
        await sendMessage(templateMessage);
      }
    }
    return flowCompletionStatus;
  }

  async updateUser(updateData) {
    await this.contactModel.updateContact(this.waId, updateData);
  }
}

class SignpostingFlow extends BaseFlow {
  constructor(db, userInfo, userMessage, contactModel) {
    super(db, userInfo, userMessage, contactModel);
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

  async checkUserSelectionError(location, category, supportOptionService) {
    const isValidLocation = [
      "local only",
      "national only",
      "local and national",
    ].includes(location.toLowerCase());
    const validCategories = await supportOptionService.getTags();
    const isValidCategory = validCategories.includes(category);
    if (!isValidCategory || !isValidLocation) {
      return true;
    } else return false;
  }

  async handleFlowStep(
    flowStep,
    userSelection,
    supportOptionService,
    llmService
  ) {
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
      const { location, category, page, endFlow } = userSelection;
      if (endFlow) {
        const message = this.createEndFlowMessage(this.waId);
        await sendMessage(message);
        flowCompletionStatus = true;
      } else {
        const error = await this.checkUserSelectionError(
          location,
          category,
          supportOptionService
        );
        if (error) {
          flowCompletionStatus = true;
          const errorMessage = await this.createErrorMessage(this.waId);
          await sendMessage(errorMessage);
          return flowCompletionStatus;
        }
        const { postcode, language, region } = this.userInfo;
        const tag = formatTag(category);
        const pageSize = 5;
        const location_choice = location.toLowerCase();
        const dbResult = await supportOptionService.selectOptions(
          tag,
          location_choice,
          region,
          page,
          pageSize,
          true
        );
        const { result, remaining } = dbResult;
        if (result.length < 1) {
          flowCompletionStatus = true;
          const message = this.createNoOptionsMessage(this.waId);
          await sendMessage(message);
          return flowCompletionStatus;
        }
        const moreOptionsAvailable = remaining >= pageSize;
        if (!moreOptionsAvailable) {
          flowCompletionStatus = true;
        }
        const aiApiRequest = {
          options: result,
          postcode: postcode,
          language: language,
          category: category,
        };
        console.log("sent to llm", JSON.stringify(aiApiRequest));
        const response = await llmService.make_llm_request(aiApiRequest);
        const llmResponse = response.data;
        const firstText = "Here are some support options:";
        const firstMessage = createTextMessage(this.waId, firstText);
        await sendMessage(firstMessage);
        for (const [index, item] of llmResponse.entries()) {
          const messageContent = item;
          console.log("sending message:", messageContent);
          const message = createTextMessage(this.waId, messageContent);
          await sendMessage(message);
          if (index === result.length - 1) {
            const lastMessage = this.createLastOptionMessage(
              this.waId,
              moreOptionsAvailable
            );
            await sendMessage(lastMessage);
          }
        }
      }
    }
    return flowCompletionStatus;
  }
  createLastOptionMessage(recipient, moreOptionsAvailable) {
    let message;
    if (moreOptionsAvailable) {
      const contentSid = "HX31992901024acd003249c56f412fba4f"; //TO-DO store hard coded ids somewhere
      message = createTemplateMessage(recipient, contentSid);
    } else {
      const text =
        "Thanks for using the service just now, please text 'hi' to search again";
      message = createTextMessage(recipient, text);
    }
    return message;
  }
  createEndFlowMessage(recipient) {
    const text =
      "Thanks for using the service just now, please text 'hi' to search again";
    const message = createTextMessage(recipient, text);
    return message;
  }
  createNoOptionsMessage(recipient) {
    const text =
      "There seems to be nothing in our database for your search right now, please text 'hi' to start a new search";
    const message = createTextMessage(recipient, text);
    return message;
  }
}

class EditDetailsFlow extends BaseFlow {
  constructor(db, userInfo, userMessage, contactModel) {
    super(db, userInfo, userMessage, contactModel);
  }
  async handleFlowStep(flowStep, userDetailUpdate) {
    let flowCompletionStatus = false;
    if (userDetailUpdate?.endFlow) {
      flowCompletionStatus = true;
      return flowCompletionStatus;
    }
    if (flowStep === 1 || flowStep === 4) {
      const templateSid = await findTemplateSid("edit_details", false);
      const templateVariables = {
        "edit_details_text": "Which information would you like to edit?",
      };
      const templateMessage = createTemplateMessage(
        this.waId,
        templateSid,
        templateVariables
      );
      await sendMessage(templateMessage);
    } else if (flowStep === 2) {
      const detailField = userDetailUpdate.detailField;
      const currentValue = await this.contactModel.getContactDetail(
        this.waId,
        detailField
      );
      if (detailField !== "language" && detailField !== "region") {
        const texts = {
          "username": `Your name is currently registered as ${currentValue}, what would you like to your name to be changed to?`,
          "postcode": `Your postcode is currently registered as ${currentValue}, what would you like to your postcode to be changed to?`,
          "organization": `Your organization is currently registered as ${currentValue}, what would you like to your organization to be changed to?`,
        };
        const text = texts[detailField];
        const message = createTextMessage(this.waId, text);
        await sendMessage(message);
      } else {
        if (detailField === "language") {
          const templateSid = await findTemplateSid("edit_language", false);
          const message = createTemplateMessage(this.waId, templateSid);
          await sendMessage(message);
        } else if (detailField === "region") {
          const templateSid = await findTemplateSid("select_region", false);
          const templateVariables = {
            select_region_message: `Your region is currently set to ${currentValue}. What would you like to set your region to?`,
          };
          const message = createTemplateMessage(
            this.waId,
            templateSid,
            templateVariables
          );
          await sendMessage(message);
        }
      }
    } else if (flowStep === 3) {
      const { detailField, detailValue } = userDetailUpdate;
      await this.updateUser({ [detailField]: detailValue });
      const templateSid = await findTemplateSid("add_update");
      const templateVariables = {
        "update_success_text":
          detailField === "username"
            ? "Your name has been updated!"
            : `Your ${detailField} has been updated!`,
      };
      const message = createTemplateMessage(
        this.waId,
        templateSid,
        templateVariables
      );
      await sendMessage(message);
    }

    return flowCompletionStatus;
  }
  async updateUser(updateData) {
    await this.contactModel.updateContact(this.waId, updateData);
  }
}
module.exports = {
  OnboardingFlow,
  SignpostingFlow,
  EditDetailsFlow,
};
