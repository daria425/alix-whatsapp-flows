const { PostRequestService } = require("../services/PostRequestService");
const {
  flow_api_base,
  transcription_api_base,
} = require("../config/api_base.config");
const { DatabaseService } = require("../services/DatabaseService");
const { FlowManagerService } = require("../services/FlowManagerService");
const { enhamPARegisterConfig } = require("../config/flows.config");
/**
 * Base class for handling message operations.
 */
class BaseMessageHandler {
  /**
   * Initializes a new instance of BaseMessageHandler.
   * @constructor
   * @param {Object} params - Parameters for initializing the handler.
   * @param {Object} params.req - The HTTP request object from Express.
   * @param {Object} params.res - The HTTP response object from Express.
   * @param {string} params.organizationPhoneNumber - The organization's phone number.
   * @param {Object} params.firestore - Firestore database instance.
   * @param {boolean} params.clientSideTriggered - Indicates if the request originated from the client side (sent from control room).
   * @param {boolean} params.isReminder - Indicates if this is a reminder message (created via cron job, used for Survey flow).
   * @see {@link PostRequestService} for making HTTP requests
   * @see {@link DatabaseService} for database operations
   */
  static INITIAL_QUESTION_DICT = {
    "enham-pa-register": enhamPARegisterConfig,
  };

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
    this.flowManagerService = new FlowManagerService(firestore);
    this.organizationPhoneNumber = organizationPhoneNumber;
    this.firestore = firestore;
    this.body = req.body;
    this.res = res;
    this.clientSideTriggered = clientSideTriggered;
    this.buttonPayload = this.body?.ButtonPayload ?? "";
    this.isReminder = isReminder;
  }

  async getUserOrganization() {
    return this.databaseService.getOrganization(this.organizationPhoneNumber);
  }
  async getUserInfo() {
    const registeredUser = await this.databaseService.getUser(
      this.body.WaId,
      this.organizationPhoneNumber,
      this.body.ProfileName
    );
    const userInfo = registeredUser || {
      //extract user information to be used in the flows later and sent to the Flows microservice
      "WaId": this.body.WaId,
      "ProfileName": this.body.ProfileName,
    };
    return userInfo;
  }
  async handleOptOutOptIn() {
    await this.databaseService.updateUser(
      this.body.WaId,
      this.organizationPhoneNumber,
      { "opted_in": this.body.Body === "OPT-IN" }
    );
  }
  async handleFlowError(err) {
    console.error(err);
    await this.flowManagerService.deleteFlowOnErr({
      userId: this.body.WaId,
      err,
    });
  }
  async isFlowEnabled(flowName, organizationId) {
    const isEnabled = await this.databaseService.checkFlowPermission(
      flowName,
      organizationId
    );
    return isEnabled;
  }
  getInitialSurveyQuestion(flowName, messageData) {
    const { INITIAL_QUESTION_DICT } = BaseMessageHandler;
    const initialQuestion =
      INITIAL_QUESTION_DICT[flowName]?.[messageData.flowSection]?.[
        messageData.flowStep
      ];

    if (!initialQuestion) return {};
    const { questionContent, questionNumber } = initialQuestion;
    return {
      flowResponses: [
        {
          questionContent,
          questionNumber,
          CreatedAt: new Date(),
          originalMessageSid: messageData.MessageSid,
        },
      ],
    };
  }
  /**
   * Creates message data to be sent based on the user and flow information.
   * @param {Object} params - Parameters for creating message data.
   * @param {Object} params.userInfo - The user data object, contains additional information about the user if they have already been contacted by the organizations number.
   * @param {string} params.flowName - The name of the flow.
   * @param {string} params.trackedFlowId - The ID tracking the flow.
   * @param {number} params.flowStep - The current step in the flow.
   * @param {number} params.flowSection - The current section in the flow.
   * @returns {Promise<Object>} The constructed message data object,
   * adds additional information to the message body recieved from either Twilio's API (if a user sends a message directly to the service)
   * or to the mock message body recieved from the front-end (req.body in both cases).
   * @see {@link DatabaseService#getMessagingServiceSid} to fetch the messaging service ID configured for an organization
   */
  async createMessageData({
    userInfo,
    flowName,
    trackedFlowId,
    flowStep,
    flowSection,
    restarted,
  }) {
    const organizationMessagingServiceSid =
      await this.databaseService.getMessagingServiceSid(
        this.organizationPhoneNumber
      );
    return {
      userInfo,
      organizationPhoneNumber: this.organizationPhoneNumber,
      organizationMessagingServiceSid,
      userMessage: {
        ...this.body,
        trackedFlowId,
        clientSideTriggered: this.clientSideTriggered,
        isReminder: this.isReminder,
      },
      restarted,
      flowName,
      flowStep,
      flowSection,
      startTime: new Date(),
    };
  }
}

module.exports = {
  BaseMessageHandler,
};
