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

class BaseMessageHandler {
  constructor(req, res, organizationNumber, firestore) {
    this.postRequestService = new PostRequestService(api_base);
    this.databaseService = new DatabaseService(req.app.locals.db);
    this.organizationNumber = organizationNumber;
    this.firestore = firestore;
    this.body = req.body;
    this.res = res;
  }
  createMessageData(userData, flowName, flowStep, clientSideTriggered) {
    return {
      userInfo: userData,
      organizationPhoneNumber: this.organizationNumber,
      message: this.body,
      flowName,
      clientSideTriggered,
      flowStep,
      startTime: new Date(),
    };
  }
}
class MessageHandlerService extends BaseMessageHandler {
  constructor(req, res, organizationNumber, firestore) {
    super(req, res, organizationNumber, firestore);
    this.seeMoreOptionMessages = ["See More Options", "That's great, thanks"];
    this.addUpdateMessages = ["Yes", "No thanks"];
  }

  async handle() {
    try {
      const registeredUser = await this.databaseService.getUser(this.body.WaId);
      const organization = await this.databaseService.getOrganization(
        this.organizationNumber
      );
      const userData = registeredUser || {
        "WaId": this.body.WaId,
        "ProfileName": this.body.ProfileName,
      };
      const messageToSave = {
        OrganizationId: organization._id,
        ...this.body,
        CreatedAt: new Date(),
        Direction: "inbound",
        Status: "recieved",
      };
      console.log(this.body);
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
      await deleteFlowOnErr(this.firestore, this.body.WaId, err);
      this.res.status(500).send(err);
    }
  }
  isGreeting() {
    return this.body.Body.toLowerCase() === "hi";
  }

  isEditDetailsRequest() {
    return this.body.Body.toLowerCase().trim() === "edit details";
  }

  async startFlow(userData, messageToSave, flowName, extraData = {}) {
    const messageData = this.createMessageData(userData, flowName, 1, false);
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
      this.addUpdateMessages
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
      await this.databaseService.registerFlowCompletion(
        recipient,
        update,
        this.organizationNumber
      );
      await deleteFlowOnCompletion(this.firestore, flowId);
    }
    messageToSave.Flow = flowName;
    await this.databaseService.saveMessage(messageToSave);
    this.res.status(200).send(response.data);
  }
}

class FlowTriggerService extends BaseMessageHandler {
  constructor(req, res, organizationNumber, firestore) {
    super(req, res, organizationNumber, firestore);
    this.flow = this.body.flow;
  }

  async handle() {
    const registeredUser = await this.databaseService.getUser(this.body.WaId);

    if (!this.flow.isSendable) {
      this.res.status(403).send("Flow not enabled for this organization");
      return;
    }
    const userData = registeredUser || {
      "WaId": this.body.WaId,
      "ProfileName": this.body.ProfileName,
    };
    if (this.body.flowName === "onboarding") {
      await this.databaseService.saveUser(userData);
    }
    await this.startFlow(userData, this.flow.name);
  }
  async startFlow(userData, flowName, extraData = {}) {
    const messageData = this.createMessageData(userData, flowName, 1, true);
    await createNewFlow(this.firestore, messageData, extraData);
    const response = await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );
    this.res.status(200).send(response.data);
  }
}

module.exports = {
  FlowTriggerService,
  MessageHandlerService,
};
