const { PostRequestService } = require("../services/PostRequestService");
const {
  flow_api_base,
  transcription_api_base,
} = require("../config/api_base.config");
const { DatabaseService } = require("../services/DatabaseService");
/**
 * Base class for handling inbound message operations.
 */
class BaseMessageHandler {
  /**
   * Creates an instance of BaseMessageHandler.
   * @param {Object} params - Parameters for the handler.
   * @param {Object} params.req - The request object.
   * @param {Object} params.res - The response object.
   * @param {string} params.organizationPhoneNumber - The organization phone number.
   * @param {Object} params.firestore - Firestore database instance.
   * @param {boolean} params.clientSideTriggered - Indicates if the request was triggered from the client side.
   * @param {boolean} params.isReminder - Indicates if this is a reminder message.
   */

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
  /**
   * Creates message data to be sent based on the user and flow information.
   * @param {Object} params - Parameters for creating message data.
   * @param {Object} params.userInfo - The user data object.
   * @param {string} params.flowName - The name of the flow.
   * @param {string} params.trackedFlowId - The ID tracking the flow.
   * @param {number} params.flowStep - The current step in the flow.
   * @param {number} params.flowSection - The current section in the flow.
   * @returns {Promise<Object>} The constructed message data object,
   * adds additional information to the message body recieved from either Twilio's API (if a user sends a message directly to the service)
   * or to the mock message body recieved from the front-end (req.body in both cases).
   */
  async createMessageData({
    userInfo,
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
      userInfo,
      organizationPhoneNumber: this.organizationPhoneNumber,
      organizationMessagingServiceSid,
      userMessage: {
        ...this.body,
        trackedFlowId,
        clientSideTriggered: this.clientSideTriggered,
        isReminder: this.isReminder,
      },
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
