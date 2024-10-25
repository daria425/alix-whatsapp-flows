const {
  createTextMessage,
  createTemplateMessage,
} = require("../helpers/messages.helpers");
const { formatTag } = require("../helpers/format.helpers");
const { generateProfileColor } = require("../utils/generateProfileColor");
const { sendMessage } = require("../helpers/twilio.helpers");
const { findTemplateSid } = require("../helpers/twilio_account.helpers");
const { surveyConfig } = require("../config/survey.config");
class BaseFlow {
  constructor(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid
  ) {
    this.db = db;
    this.userInfo = userInfo;
    this.WaId = userInfo.WaId;
    this.userMessage = userMessage;
    this.messageContent = this.userMessage?.Body;
    this.buttonPayload = this.userMessage?.ButtonPayload ?? "-";
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

class OnboardingFlow extends BaseFlow {
  static FLOW_NAME = "onboarding";
  static ONBOARDING_TEXTS = {
    2: "Step 1 of 5: To begin, what is your name?",
    3: "Nice to meet you!\nStep 2 of 5: To ensure we have the right information, could you share the name of the organisation you work for?",
    5: "Step 4 of 5: Great, to better assist you could you let us know the postcode you will be seeking support around?",
  };
  static FINAL_FLOW_STEP = 8;

  constructor(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid
  ) {
    super(
      db,
      userInfo,
      userMessage,
      contactModel,
      organizationPhoneNumber,
      organizationMessagingServiceSid
    );
  }
  async handleFlowStep(flowStep) {
    let flowCompletionStatus = false;
    switch (flowStep) {
      case 1: {
        await this.handleTemplateMessage({ templateKey: "onboarding_welcome" });
        break;
      }
      case 2: {
        const text = OnboardingFlow.ONBOARDING_TEXTS[flowStep];
        const message = createTextMessage({
          waId: this.WaId,
          textContent: text,
          messagingServiceSid: this.messagingServiceSid,
        });
        await this.saveAndSendTextMessage(message, OnboardingFlow.FLOW_NAME);
        break;
      }
      case 3: {
        await this.handleUpdateAndResponse(
          { username: this.messageContent },
          flowStep
        );
        break;
      }
      case 4: {
        await this.handleTemplateMessage({
          templateKey: "select_region",
          templateVariables: {
            select_region_message: `Step 3 of 5: Could you let us know the region you will be seeking support around?`,
          },
          updateData: { organization: this.messageContent },
        });
        break;
      }
      case 5: {
        await this.handleUpdateAndResponse(
          { region: this.messageContent },
          flowStep
        );
        break;
      }
      case 6: {
        await this.handleTemplateMessage({
          templateKey: "select_language",
          templateVariables: {
            select_language_message:
              "Step 5 of 5: Please select a language you would like to see information in",
          },
          updateData: {
            "postcode": this.messageContent,
          },
        });
        break;
      }
      case 7: {
        await this.handleTemplateMessage({
          templateKey: "consent_to_privacy",
          templateVariables: {
            consent_message: `Thank you for sharing.\nBy continuing you agree to our privacy policy, which can be viewed here:\nhttps://www.projectalix.com/privacy\nDo you agree to proceed with assistance?\nPlease press 'consent' to continue.`,
          },
          updateData: { language: this.messageContent },
        });
        break;
      }
      case OnboardingFlow.FINAL_FLOW_STEP: {
        await this.updateUser({
          completed_onboarding: true,
          opted_in: true,
          profileColor: generateProfileColor(),
        });
        await this.handleLastMessage();
        flowCompletionStatus = true;
        break;
      }
    }
    return flowCompletionStatus;
  }
  async handleUpdateAndResponse(updateData, flowStep) {
    await this.updateUser(updateData);
    const text = OnboardingFlow.ONBOARDING_TEXTS[flowStep];
    const message = createTextMessage({
      waId: this.WaId,
      textContent: text,
      messagingServiceSid: this.messagingServiceSid,
    });
    await this.saveAndSendTextMessage(message, OnboardingFlow.FLOW_NAME);
  }
  async handleTemplateMessage({ templateKey, templateVariables, updateData }) {
    if (updateData) {
      await this.updateUser(updateData);
    }
    await this.saveAndSendTemplateMessage({
      templateKey,
      templateVariables,
      flowName: OnboardingFlow.FLOW_NAME,
    });
  }
  async handleLastMessage() {
    const text =
      "Thank you for registering with us. Please message 'hi' to begin a search";
    const message = createTextMessage({
      waId: this.WaId,
      textContent: text,
      messagingServiceSid: this.messagingServiceSid,
    });
    await this.saveAndSendTextMessage(message, OnboardingFlow.FLOW_NAME);
  }
}
class SignpostingFlow extends BaseFlow {
  static FLOW_NAME = "signposting";
  constructor(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid
  ) {
    super(
      db,
      userInfo,
      userMessage,
      contactModel,
      organizationPhoneNumber,
      organizationMessagingServiceSid
    );
    this.signpostingTemplates = {};
  }
  async init() {
    try {
      const template1 = await findTemplateSid("signposting_options_1", false);
      this.signpostingTemplates[1] = {
        templateSid: template1?.templateSid,
        templateName: template1?.templateName,
        templateVariables: {
          greeting:
            "Welcome, please select a category below to see support options",
        },
      };

      const template2 = await findTemplateSid(this.messageContent);
      this.signpostingTemplates[2] = {
        templateSid: template2?.templateSid,
        templateName: template2?.templateName,
        templateVariables: {
          select_further_options:
            "Thank you, please select a further option from the below",
        },
      };

      const template3 = await findTemplateSid("location_choice", false);
      this.signpostingTemplates[3] = {
        templateSid: template3?.templateSid,
        templateName: template3?.templateName,
        templateVariables: {
          location_choice_message:
            "Thank you, would you like to see local options, national options or both?",
        },
      };
    } catch (err) {
      console.error("Error initializing templates:", err);
    }
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
      const templateName = this.signpostingTemplates[flowStep]["templateName"];
      const templateMessage = createTemplateMessage({
        waId: this.WaId,
        contentSid: templateSid,
        templateVariables,
        messagingServiceSid: this.messagingServiceSid,
      });
      const insertedId = await this.saveResponseMessage({
        message: templateMessage,
        flowName: SignpostingFlow.FLOW_NAME,
        templateName,
      });
      const sid = await sendMessage(templateMessage);
      await this.updateResponse(insertedId, sid);
    }
    if (flowStep >= 4) {
      const { location, category, page, endFlow } = userSelection;
      if (endFlow) {
        const message = this.createEndFlowMessage(this.WaId);
        await this.saveAndSendTextMessage(message, SignpostingFlow.FLOW_NAME);
        flowCompletionStatus = true;
      } else {
        const error = await this.checkUserSelectionError(
          location,
          category,
          supportOptionService
        );
        if (error) {
          flowCompletionStatus = true;
          const errorMessage = await this.createErrorMessage(this.WaId);
          await this.saveAndSendTextMessage(
            errorMessage,
            SignpostingFlow.FLOW_NAME
          );
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
          const message = this.createNoOptionsMessage(this.WaId);
          await this.saveAndSendTextMessage(message, SignpostingFlow.FLOW_NAME);
          return flowCompletionStatus;
        }
        const moreOptionsAvailable = remaining >= 1;
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
        const firstMessage = createTextMessage({
          waId: this.WaId,
          textContent: firstText,
          messagingServiceSid: this.messagingServiceSid,
        });
        await this.saveAndSendTextMessage(
          firstMessage,
          SignpostingFlow.FLOW_NAME
        );
        for (const [index, item] of llmResponse.entries()) {
          console.log("sending message:", item);
          const message = createTextMessage({
            waId: this.WaId,
            textContent: item,
            messagingServiceSid: this.messagingServiceSid,
          });
          await this.saveAndSendTextMessage(message, SignpostingFlow.FLOW_NAME);
          if (index === result.length - 1) {
            const { lastMessage, templateName = null } =
              await this.createLastOptionMessage(
                this.WaId,
                moreOptionsAvailable
              );
            const insertedId = await this.saveResponseMessage({
              message: lastMessage,
              flowName: SignpostingFlow.FLOW_NAME,
              templateName,
            });
            const sid = await sendMessage(lastMessage);
            await this.updateResponse(insertedId, sid);
          }
        }
      }
    }
    return flowCompletionStatus;
  }
  async createLastOptionMessage(recipient, moreOptionsAvailable) {
    let lastMessage, searchableTemplateName;
    if (moreOptionsAvailable) {
      const { templateSid, templateName } = await findTemplateSid(
        "see_more_options",
        false
      );
      const templateVariables = {
        see_more_options_message: "Would you like to see more options?",
      };
      lastMessage = createTemplateMessage({
        waId: recipient,
        contentSid: templateSid,
        templateVariables,
        messagingServiceSid: this.messagingServiceSid,
      });
      searchableTemplateName = templateName;
    } else {
      const text =
        "Thanks for using the service just now, please text 'hi' to search again";
      lastMessage = createTextMessage({
        waId: recipient,
        textContent: text,
        messagingServiceSid: this.messagingServiceSid,
      });
    }
    return { templateName: searchableTemplateName, lastMessage };
  }
  createEndFlowMessage(recipient) {
    const text =
      "Thanks for using the service just now, please text 'hi' to search again";
    const message = createTextMessage({
      waId: recipient,
      textContent: text,
      messagingServiceSid: this.messagingServiceSid,
    });
    return message;
  }
  createNoOptionsMessage(recipient) {
    const text =
      "There seems to be nothing in our database for your search right now, please text 'hi' to start a new search";
    const message = createTextMessage({
      waId: recipient,
      textContent: text,
      messagingServiceSid: this.messagingServiceSid,
    });
    return message;
  }
}

class EditDetailsFlow extends BaseFlow {
  static FLOW_NAME = "edit-details";
  constructor(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid
  ) {
    super(
      db,
      userInfo,
      userMessage,
      contactModel,
      organizationPhoneNumber,
      organizationMessagingServiceSid
    );
  }
  async handleFlowStep(flowStep, userDetailUpdate) {
    let flowCompletionStatus = false;
    if (userDetailUpdate?.endFlow) {
      flowCompletionStatus = true;
      return flowCompletionStatus;
    }
    if (flowStep === 1 || flowStep === 4) {
      const templateKey = "edit_details";
      const templateVariables = {
        "edit_details_text": "Which information would you like to edit?",
      };
      await this.saveAndSendTemplateMessage({
        templateKey,
        templateVariables,
        flowName: EditDetailsFlow.FLOW_NAME,
      });
    } else if (flowStep === 2) {
      const detailField = userDetailUpdate.detailField;
      const currentValue = await this.contactModel.getContactDetail(
        this.WaId,
        detailField
      );
      if (detailField !== "language" && detailField !== "region") {
        const texts = {
          "username": `Your name is currently registered as ${currentValue}, what would you like to your name to be changed to?`,
          "postcode": `Your postcode is currently registered as ${currentValue}, what would you like to your postcode to be changed to?`,
          "organization": `Your organization is currently registered as ${currentValue}, what would you like to your organization to be changed to?`,
        };
        const text = texts[detailField];
        const message = createTextMessage({
          waId: this.WaId,
          textContent: text,
          messagingServiceSid: this.messagingServiceSid,
        });
        await this.saveAndSendTextMessage(message, EditDetailsFlow.FLOW_NAME);
      } else {
        if (detailField === "language") {
          const templateKey = "edit_language";
          const templateVariables = {
            edit_language_message:
              "Which language would you like to see information in?",
          };
          await this.saveAndSendTemplateMessage({
            templateKey,
            templateVariables,
            flowName: EditDetailsFlow.FLOW_NAME,
          });
        } else if (detailField === "region") {
          const templateKey = "edit_region";
          const templateVariables = {
            select_region_message: `Your region is currently set to ${currentValue}. What would you like to set your region to?`,
          };
          await this.saveAndSendTemplateMessage({
            templateKey,
            templateVariables,
            flowName: EditDetailsFlow.FLOW_NAME,
          });
        }
      }
    } else if (flowStep === 3) {
      const { detailField, detailValue } = userDetailUpdate;
      await this.updateUser({ [detailField]: detailValue });
      const templateKey = "add_update";
      const templateVariables = {
        "update_success_text":
          detailField === "username"
            ? "Your name has been updated! Would you like to update anything else?"
            : `Your ${detailField} has been updated! Would you like to update anything else?`,
      };
      await this.saveAndSendTemplateMessage({
        templateKey,
        templateVariables,
        flowName: EditDetailsFlow.FLOW_NAME,
      });
    }

    return flowCompletionStatus;
  }
}

class FatMacysSurveyFlow extends BaseFlow {
  static FLOW_NAME = "survey";
  static LAST_SECTION = 7;
  static LAST_STEP = 6;
  constructor(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid
  ) {
    super(
      db,
      userInfo,
      userMessage,
      contactModel,
      organizationPhoneNumber,
      organizationMessagingServiceSid
    );
  }
  async handleFlowStep(flowStep, flowSection, cancelSurvey) {
    let flowCompletionStatus = false;
    if (cancelSurvey) {
      const message = this.createCancellationMessage(this.WaId);
      await this.saveAndSendTextMessage(message, FatMacysSurveyFlow.FLOW_NAME);
      flowCompletionStatus = true;
      return flowCompletionStatus;
    }
    if (flowStep === 1 && flowSection === 1) {
      this.userMessage?.isReminder
        ? await this.handleTemplateMessage({ templateKey: "survey_reminder" })
        : await this.handleTemplateMessage({ templateKey: "survey_intro" });
    } else {
      const { responseContent, responseType, templateKey } =
        surveyConfig[flowSection][flowStep];
      if (
        flowStep === FatMacysSurveyFlow.LAST_STEP &&
        flowSection === FatMacysSurveyFlow.LAST_SECTION
      ) {
        flowCompletionStatus = true;
      }
      console.log("full user message passed in", this.userMessage);
      console.log(
        "current flow step passed in:",
        flowStep,
        "current flow section passed in:",
        flowSection,
        "message content:",
        this.messageContent
      );
      if (flowSection === 1 && flowStep === 4) {
        const shareName = this.buttonPayload.split("-")[0] === "sharename";
        const nameUpdate = {
          ProfileName: shareName ? undefined : "Anon",
          username: shareName ? undefined : "Anon",
          isAnon: shareName ? false : true,
        };
        await this.updateUser(nameUpdate);
      }
      if (flowSection === 2 && flowStep === 1) {
        const isContactable = this.buttonPayload.split("-")[0] === "followup";
        console.log("user is contactable", isContactable);
        const updateData = {
          isContactable,
        };
        await this.updateUser(updateData);
      }
      if (responseType === "text") {
        const message = createTextMessage({
          waId: this.WaId,
          textContent: responseContent,
          messagingServiceSid: this.messagingServiceSid,
        });
        await this.saveAndSendTextMessage(
          message,
          FatMacysSurveyFlow.FLOW_NAME
        );
      } else if (responseType === "template") {
        await this.handleTemplateMessage({
          templateKey,
          templateVariables: responseContent,
        });
      }
    }
    return flowCompletionStatus;
  }
  async handleTemplateMessage({ templateKey, templateVariables }) {
    await this.saveAndSendTemplateMessage({
      templateKey,
      templateVariables,
      flowName: FatMacysSurveyFlow.FLOW_NAME,
    });
  }
  createCancellationMessage(recipient) {
    const text = "No worries!";
    const message = createTextMessage({
      waId: recipient,
      textContent: text,
      messagingServiceSid: this.messagingServiceSid,
    });
    return message;
  }
}

module.exports = {
  OnboardingFlow,
  SignpostingFlow,
  EditDetailsFlow,
  FatMacysSurveyFlow,
};
