const {
  createNewFlow,
  getCurrentFlow,
  deleteFlowOnCompletion,
  deleteFlowOnErr,
  updateUserSelection,
  createUserDetailUpdate,
} = require("../helpers/firestore.helpers");
const { logMessageAsJSON } = require("../helpers/logging.helpers"); //eslint-disable-line
const { PostRequestService } = require("./PostRequestService");
const { api_base } = require("../config/api_base.config");
const { DatabaseService } = require("./DatabaseService");

class MessageHandlerService {
  constructor(req, res, firestore) {
    this.postRequestService = new PostRequestService(api_base);
    this.databaseService = new DatabaseService(req.app.locals.db);
    this.firestore = firestore;
    this.body = JSON.parse(JSON.stringify(req.body));
    this.messageType = this.body.MessageType;
    this.WaId = this.body.WaId;
    this.profileName = this.body.ProfileName;
    this.organizationNumber = this.body.To;
    this.seeMoreOptionMessages = ["See More Options", "That's great, thanks"];
    this.addUpdateMessages = ["Yes", "No thanks"];
    this.res = res;
  }

  async handle() {
    try {
      const registeredUser = await this.databaseService.getUser(this.WaId);
      const organization = await this.databaseService.getOrganization(
        this.organizationNumber
      );
      const userData = registeredUser || {
        "WaId": this.WaId,
        "ProfileName": this.profileName,
      };
      const messageToSave = {
        OrganizationId: organization._id,
        ...this.body,
        CreatedAt: new Date(),
        Direction: "inbound",
        Status: "recieved",
      };

      if (!registeredUser || this.body.Body === "test") {
        await this.onboardUser(userData, messageToSave);
      } else if (this.isGreeting()) {
        await this.startSignpostingFlow(userData, messageToSave);
      } else if (this.isEditDetailsRequest()) {
        await this.startEditDetailsFlow(userData, messageToSave);
      } else {
        await this.handleExistingFlow(userData, messageToSave);
      }
    } catch (err) {
      console.error(err);
      await deleteFlowOnErr(this.firestore, this.WaId, err);
      this.res.status(500).send(err);
    }
  }
  isGreeting() {
    return this.body.Body.toLowerCase() === "hi";
  }

  isEditDetailsRequest() {
    return this.body.Body.toLowerCase().trim() === "edit details";
  }

  createMessageData(userData, flowName, flowStep) {
    return {
      userInfo: userData,
      organizationPhoneNumber: this.organizationNumber,
      message: this.body,
      flowName,
      flowStep,
      startTime: new Date(),
    };
  }
  async startFlow(userData, messageToSave, flowName, extraData = {}) {
    const messageData = this.createMessageData(userData, flowName, 1);
    await createNewFlow(this.firestore, messageData, extraData);
    const response = await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );
    messageToSave.Flow = flowName;
    await this.databaseService.saveMessage(messageToSave);
    this.res.status(200).send(response.data);
  }

  async onboardUser(userData, messageToSave) {
    await this.databaseService.saveUser(userData, this.organizationNumber);
    await this.startFlow(userData, messageToSave, "onboarding");
  }
  async startSignpostingFlow(userData, messageToSave) {
    const extraData = {
      userSelection: {
        page: 1,
        endFlow: false,
      },
    };
    await this.startFlow(userData, messageToSave, "signposting", extraData);
  }
  async startEditDetailsFlow(userData, messageToSave) {
    const extraData = {
      userDetailUpdate: {
        endFlow: false,
      },
    };
    await this.startFlow(userData, messageToSave, "edit-details", extraData);
  }
  async handleExistingFlow(userData, messageToSave) {
    const currentFlow = await getCurrentFlow(this.firestore, userData);
    const { flowName, flowStep, id: flowId } = currentFlow;
    console.log("flow step", flowStep);
    let updatedFlowStep = flowStep;
    if (!this.seeMoreOptionMessages.includes(this.body.Body)) {
      updatedFlowStep += 1;
    }
    console.log("updated flow step", updatedFlowStep);
    const messageData = this.createMessageData(
      userData,
      flowName,
      updatedFlowStep
    );
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
    }
    console.log("message to be sent", messageData);
    await this.processFlowResponse(
      flowName,
      messageToSave,
      messageData,
      flowId,
      this.WaId
    );
  }
  async updateUserSignpostingSelection(flowId, currentFlowStep) {
    const updatedDoc = await updateUserSelection(
      this.firestore,
      flowId,
      currentFlowStep,
      this.body.Body,
      this.seeMoreOptionMessages
    );
    return updatedDoc?.userSelection;
  }
  async updateUserDetail(flowId, currentFlowStep) {
    const updatedDoc = await createUserDetailUpdate(
      this.firestore,
      flowId,
      currentFlowStep,
      this.body.Body,
      this.seeMoreOptionMessages
    );
    return updatedDoc?.userDetailUpdate;
  }

  async processFlowResponse(
    flowName,
    messageToSave,
    messageData,
    flowId,
    recipient
  ) {
    const response = await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );
    if (response.data.flowCompletionStatus) {
      const update = { [`completed_flows.${flowName}`]: 1 };
      await this.databaseService.registerFlowCompletion(recipient, update);
      await deleteFlowOnCompletion(this.firestore, flowId);
    }
    messageToSave.Flow = flowName;
    await this.databaseService.saveMessage(messageToSave);
    this.res.status(200).send(response.data);
  }
}

module.exports = {
  MessageHandlerService,
};
