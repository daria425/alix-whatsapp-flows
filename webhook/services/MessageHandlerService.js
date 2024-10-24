const {
  createNewFlow,
  getCurrentFlow,
  deleteFlowOnCompletion,
  deleteFlowOnErr,
  updateUserSelection,
  createUserDetailUpdate,
  createCancelSurveyUpdate,
  createNextSectionUpdate,
} = require("../helpers/firestore.helpers");
const { createTranscriptionTask } = require("../helpers/cloud_tasks.helpers");
const { v4: uuidv4 } = require("uuid");
const { logMessageAsJSON } = require("../helpers/logging.helpers"); //eslint-disable-line
const { PostRequestService } = require("./PostRequestService");
const {
  flow_api_base,
  transcription_api_base,
} = require("../config/api_base.config");
const { DatabaseService } = require("./DatabaseService");
const { surveyConfig } = require("../config/survey.config");
class BaseMessageHandler {
  constructor({
    req,
    res,
    organizationPhoneNumber,
    firestore,
    clientSideTriggered,
    isReminder,
  }) {
    this.postRequestService = new PostRequestService(
      flow_api_base,
      transcription_api_base
    );
    this.databaseService = new DatabaseService(req.app.locals.db);
    this.organizationPhoneNumber = organizationPhoneNumber;
    this.firestore = firestore;
    this.body = req.body;
    this.res = res;
    this.clientSideTriggered = clientSideTriggered;
    this.isReminder = isReminder;
  }
  async createMessageData({
    userData,
    flowName,
    trackedFlowId,
    flowStep,
    flowSection,
  }) {
    const organizationMessagingServiceSid =
      await this.databaseService.getMessagingServiceSid(
        this.organizationPhoneNumber
      );
    return {
      userInfo: userData,
      organizationPhoneNumber: this.organizationPhoneNumber,
      organizationMessagingServiceSid,
      message: {
        ...this.body,
        trackedFlowId,
        clientSideTriggered: this.clientSideTriggered,
      },
      flowName,
      flowStep,
      flowSection,
      startTime: new Date(),
    };
  }
}
class MessageHandlerService extends BaseMessageHandler {
  constructor({
    req,
    res,
    organizationPhoneNumber,
    firestore,
    clientSideTriggered,
    isReminder,
  }) {
    super({
      req,
      res,
      organizationPhoneNumber,
      firestore,
      clientSideTriggered,
      isReminder,
    });
    this.seeMoreOptionMessages = ["See More Options", "That's great, thanks"];
    this.addUpdateMessages = ["Yes", "No thanks"];
    this.cancellationMessages = ["No thanks sorry"];
  }

  async handle() {
    try {
      const organization = await this.databaseService.getOrganization(
        this.organizationPhoneNumber
      );
      console.log(organization);
      const registeredUser = await this.databaseService.getUser(
        this.body.WaId,
        this.organizationPhoneNumber
      );
      const userData = registeredUser || {
        "WaId": this.body.WaId,
        "ProfileName": this.body.ProfileName,
      };
      const messageToSave = {
        OrganizationId: organization?._id || null,
        ...this.body,
        CreatedAt: new Date(),
        Direction: "inbound",
        Status: "recieved",
      };

      if (this.body.Body === "OPT-OUT") {
        await this.databaseService.updateUser(
          this.body.WaId,
          this.organizationPhoneNumber,
          { "opted_in": false }
        );
        return this.res.status(204).send();
      }
      if (this.body.Body === "OPT-IN") {
        await this.databaseService.updateUser(
          this.body.WaId,
          this.organizationPhoneNumber,
          { "opted_in": true }
        );
        return this.res.status(204).send();
      }
      if (!registeredUser || this.body.Body === "test") {
        await this.onboardUser(userData, messageToSave);
      } else if (this.isGreeting()) {
        await this.startSignpostingFlow(userData, messageToSave);
      } else if (this.isEditDetailsRequest()) {
        await this.startEditDetailsFlow(userData, messageToSave);
      } else if (this.isSurveyRequest()) {
        await this.startFatMacysSurveyFlow(userData, messageToSave);
      } else {
        await this.handleExistingFlow(userData, messageToSave);
      }
    } catch (err) {
      console.error(err);
      await deleteFlowOnErr({
        db: this.firestore,
        userId: this.body.WaId,
        err,
      });
      this.res.status(500).send(err);
    }
  }
  isGreeting() {
    return this.body.Body.toLowerCase().trim() === "hi";
  }

  isEditDetailsRequest() {
    return this.body.Body.toLowerCase().trim() === "edit details";
  }
  isSurveyRequest() {
    return this.body.Body.toLowerCase().trim() === "survey";
  }

  async startFlow({ userData, messageToSave, flowName, extraData }) {
    const trackedFlowId = uuidv4();
    const updatedMessageToSave = {
      ...messageToSave,
      Flow: flowName,
      trackedFlowId: trackedFlowId,
    };
    const messageData = await this.createMessageData({
      userData,
      flowName,
      trackedFlowId,
      flowStep: 1,
      flowSection: 1,
    });
    await createNewFlow({ db: this.firestore, messageData, extraData });
    await this.databaseService.saveFlow({
      WaId: userData.WaId,
      trackedFlowId,
      flowName,
      clientSideTriggered: this.clientSideTriggered,
      organizationPhoneNumber: this.organizationPhoneNumber,
    });
    await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );
    await this.databaseService.saveMessage(
      updatedMessageToSave,
      this.organizationPhoneNumber
    );
    if (updatedMessageToSave.MessageType === "audio") {
      await createTranscriptionTask(
        updatedMessageToSave.MediaUrl0,
        updatedMessageToSave.MessageSid
      );
    }
    this.res.status(204).send();
  }

  async onboardUser(userData, messageToSave) {
    await this.databaseService.saveUser(userData, this.organizationPhoneNumber);
    await this.startFlow({ userData, messageToSave, flowName: "onboarding" });
  }
  async startSignpostingFlow(userData, messageToSave) {
    const extraData = {
      userSelection: {
        page: 1,
        endFlow: false,
      },
    };
    await this.startFlow({
      userData,
      messageToSave,
      flowName: "signposting",
      extraData,
    });
  }
  async startEditDetailsFlow(userData, messageToSave) {
    const extraData = {
      userDetailUpdate: {
        endFlow: false,
      },
    };
    await this.startFlow({
      userData,
      messageToSave,
      flowName: "edit-details",
      extraData,
    });
  }

  async startFatMacysSurveyFlow(userData, messageToSave) {
    await this.startFlow({
      userData,
      messageToSave,
      flowName: "survey",
    });
  }
  async handleExistingFlow(userData, messageToSave) {
    const currentFlow = await getCurrentFlow(this.firestore, userData);
    const { flowName, flowStep, id: flowId } = currentFlow;
    let updatedFlowStep = flowStep;
    if (!this.seeMoreOptionMessages.includes(this.body.Body)) {
      updatedFlowStep += 1;
    }
    console.log("updated flow step", updatedFlowStep);
    const messageData = await this.createMessageData({
      userData,
      flowName,
      trackedFlowId: flowId,
      flowStep: updatedFlowStep,
      flowSection: 1,
    });
    await this.databaseService.updateFlowStatus(flowId, "in_progress");
    if (messageData.flowStep === 2 && messageData.flowSection === 1) {
      await this.databaseService.updateFlowStartTime(flowId);
    }
    if (flowName === "signposting") {
      messageData.userSelection = await this.updateUserSignpostingSelection(
        flowId,
        flowStep
      );
    } else if (flowName === "edit-details") {
      messageData.userDetailUpdate = await this.updateUserDetail(
        flowId,
        flowStep
      );
    } else if (flowName === "survey") {
      await this.databaseService.updateFlowWithResponse(
        flowId,
        this.body.Body,
        this.body.MessageSid
      );
      messageData.cancelSurvey = await this.updateSurveyCancellation(flowId);
      const buttonPayload = this.body?.ButtonPayload ?? ""; // Default to empty string if ButtonPayload doesn't exist
      const updatedDoc = await createNextSectionUpdate(
        this.firestore,
        this.body.WaId,
        buttonPayload
      );
      messageData.flowSection = updatedDoc.flowSection;
      messageData.flowStep = updatedDoc.flowStep;
      console.log("messageData here!!", messageData);
      const { questionContent, questionNumber } =
        surveyConfig?.[updatedDoc.flowSection]?.[updatedDoc.flowStep] || {};
      if (questionContent && questionNumber) {
        await this.databaseService.updateFlowSurvey(flowId, {
          questionContent,
          questionNumber,
        });
      }
    }
    console.log("message to be sent", messageData);
    await this.processFlowResponse({
      flowName,
      messageToSave,
      messageData,
      flowId,
    });
  }
  async updateUserSignpostingSelection(flowId, currentFlowStep) {
    const updatedDoc = await updateUserSelection({
      db: this.firestore,
      flowId,
      flowStep: currentFlowStep,
      selectionValue: this.body.Body,
      seeMoreOptionMessages: this.seeMoreOptionMessages,
    });
    return updatedDoc?.userSelection;
  }
  async updateUserDetail(flowId, currentFlowStep) {
    const updatedDoc = await createUserDetailUpdate({
      db: this.firestore,
      flowId,
      flowStep: currentFlowStep,
      selectionValue: this.body.Body,
      addUpdateMessages: this.addUpdateMessages,
    });
    return updatedDoc?.userDetailUpdate;
  }

  async updateSurveyCancellation(flowId) {
    const updatedDoc = await createCancelSurveyUpdate({
      db: this.firestore,
      flowId,
      selectionValue: this.body.ButtonPayload,
    });
    return updatedDoc.cancelSurvey;
  }
  async processFlowResponse({ flowName, messageToSave, messageData, flowId }) {
    const response = await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );
    if (response.data.flowCompletionStatus) {
      await this.databaseService.updateFlowStatus(flowId, "completed");
      await deleteFlowOnCompletion(this.firestore, flowId);
    }
    const updatedMessageToSave = {
      ...messageToSave,
      Flow: flowName,
      trackedFlowId: flowId,
    };
    await this.databaseService.saveMessage(
      updatedMessageToSave,
      this.organizationPhoneNumber
    );
    if (updatedMessageToSave.MessageType === "audio") {
      await createTranscriptionTask(
        updatedMessageToSave.MediaUrl0,
        updatedMessageToSave.MessageSid
      );
    }
    console.log(response.data);
    this.res.status(204).send();
  }
}

class FlowTriggerService extends BaseMessageHandler {
  constructor({
    req,
    res,
    organizationPhoneNumber,
    firestore,
    clientSideTriggered,
    isReminder,
  }) {
    super({
      req,
      res,
      organizationPhoneNumber,
      firestore,
      clientSideTriggered,
      isReminder,
    });
    this.flow = this.body.flow;
    this.contacts = this.body.contactList;
  }
  async handle() {
    const errors = [];
    const promises = this.contacts.map(async (contact) => {
      try {
        await this.handleBulkMessages(
          contact.WaId,
          contact.ProfileName,
          this.organizationPhoneNumber
        );
      } catch (err) {
        console.error("An error occured", err);
        errors.push(
          `Failed to process message for ${contact.WaId}-${contact.ProfileName}`
        );
      }
    });
    await Promise.all(promises);
    if (errors.length > 0) {
      return this.res.status(500).send("An error occurred processing messages");
    }
    return this.res.status(200).send("Messages processed");
  }
  async handleBulkMessages(WaId, ProfileName, organizationPhoneNumber) {
    const registeredUser = await this.databaseService.getUser(
      WaId,
      organizationPhoneNumber
    );

    if (!this.flow.isSendable) {
      throw new Error("Flow not enabled for this organization");
    }
    const userData = registeredUser || {
      "WaId": WaId,
      "ProfileName": ProfileName,
    };
    if (this.flow.flowName === "onboarding") {
      await this.databaseService.saveUser(userData);
    }
    await this.startFlow({ userData, flowName: this.flow.flowName });
    console.log(`Message sent to ${userData.ProfileName}`);
  }
  async startFlow({ userData, flowName }) {
    const trackedFlowId = uuidv4();
    const messageData = await this.createMessageData({
      userData,
      flowName,
      trackedFlowId,
      flowStep: 1,
      flowSection: 1,
    });
    await this.databaseService.saveFlow({
      WaId: userData.WaId,
      trackedFlowId,
      flowName,
      clientSideTriggered: this.clientSideTriggered,
      isReminder: this.isReminder,
      organizationPhoneNumber: this.organizationPhoneNumber,
    });
    //HERE WE DONT SAVE THE MESSAGE BECAUSE IT ISNT AN ACTUAL WHATSAPP MESSAGE

    await createNewFlow({ db: this.firestore, messageData });
    await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );
  }
}

module.exports = {
  FlowTriggerService,
  MessageHandlerService,
};
