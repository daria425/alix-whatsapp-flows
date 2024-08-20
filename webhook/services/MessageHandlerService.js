const {
  createNewFlow,
  getCurrentFlow,
  deleteFlowOnCompletion,
  deleteFlowOnErr,
  updateUserSelection,
  createUserDetailUpdate,
} = require("../helpers/firestore.helpers");
const { PostRequestService } = require("../services/PostRequestService");
const { api_base } = require("../config/api_base.config");
const { UserService } = require("../services/UserService");
const { firestore } = require("../config/firestore.config");

class MessageHandlerService {
  constructor(req, res) {
    this.postRequestService = new PostRequestService(api_base);
    this.userService = new UserService(req.app.locals.db);
    this.body = JSON.parse(JSON.stringify(req.body));
    this.waId = this.body.WaId;
    this.profileName = this.body.ProfileName;
    this.organizationNumber = this.body.To;
    this.seeMoreOptionMessages = ["See More Options", "That's great, thanks"];
    this.addUpdateMessages = ["Yes", "No thanks"];
    this.res = res;
  }

  async handle() {
    try {
      const registeredUser = await this.userService.getUser(this.waId);
      const userData = registeredUser || {
        "WaId": this.waId,
        "ProfileName": this.profileName,
      };
      if (!registeredUser || this.body.Body === "test") {
        await this.onboardUser(userData);
      } else if (this.isGreeting()) {
        await this.startSignpostingFlow(userData);
      } else if (this.isEditDetailsRequest()) {
        await this.startEditDetailsFlow(userData);
      } else {
        await this.handleExistingFlow(userData);
      }
    } catch (err) {
      console.error(err);
      await deleteFlowOnErr(firestore, this.waId, err);
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
      message: this.body,
      flowName,
      flowStep,
    };
  }
  async startFlow(userData, flowName, extraData = {}) {
    const messageData = this.createMessageData(userData, flowName, 1);
    await createNewFlow(firestore, messageData, extraData);
    const response = await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );
    this.res.status(200).send(response.data);
  }

  async onboardUser(userData) {
    await this.userService.saveUser(userData, this.organizationNumber);
    await this.startFlow(userData, "onboarding");
  }
  async startSignpostingFlow(userData) {
    const extraData = {
      userSelection: {
        page: 1,
        endFlow: false,
      },
    };
    await this.startFlow(userData, "signposting", extraData);
  }
  async startEditDetailsFlow(userData) {
    const extraData = {
      userDetailUpdate: {
        endFlow: false,
      },
    };
    await this.startFlow(userData, "edit-details", extraData);
  }
  async handleExistingFlow(userData) {
    const currentFlow = await getCurrentFlow(firestore, userData);
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
    await this.processFlowResponse(flowName, messageData, flowId, this.waId);
  }
  async updateUserSignpostingSelection(flowId, currentFlowStep) {
    const updatedDoc = await updateUserSelection(
      firestore,
      flowId,
      currentFlowStep,
      this.body.Body,
      this.seeMoreOptionMessages
    );
    return updatedDoc?.userSelection;
  }
  async updateUserDetail(flowId, currentFlowStep) {
    const updatedDoc = await createUserDetailUpdate(
      firestore,
      flowId,
      currentFlowStep,
      this.body.Body,
      this.seeMoreOptionMessages
    );
    return updatedDoc?.userDetailUpdate;
  }

  async processFlowResponse(flowName, messageData, flowId, recipient) {
    const response = await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );

    if (response.data.flowCompletionStatus) {
      const update = { [`completed_flows.${flowName}`]: 1 };
      await this.userService.registerFlowCompletion(recipient, update);
      await deleteFlowOnCompletion(firestore, flowId);
    }

    this.res.status(200).send(response.data);
  }
}

module.exports = {
  MessageHandlerService,
};
