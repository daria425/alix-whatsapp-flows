const { createTranscriptionTask } = require("../helpers/cloud_tasks.helpers");
const { v4: uuidv4 } = require("uuid");
const { BaseMessageHandler } = require("./BaseMessageHandler");
const { surveyConfig } = require("../config/survey.config");

/**
 * Service for handling inbound messages from the Twilio API and triggering flows.
 * @extends BaseMessageHandler
 */
class InboundMessageHandler extends BaseMessageHandler {
  /**
   * Creates an instance of InboundMessageHandler.
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
  }

  /**
   * Main handler for processing messages based on user input.
   * @returns {Promise<void>}
   */

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
      const userInfo = registeredUser || {
        "WaId": this.body.WaId,
        "ProfileName": this.body.ProfileName,
      };
      //Adding additional properties to the inbound message to be stored in the database
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
        await this.onboardUser(userInfo, messageToSave);
      } else if (this.isGreeting()) {
        await this.startSignpostingFlow(userInfo, messageToSave);
      } else if (this.isEditDetailsRequest()) {
        await this.startEditDetailsFlow(userInfo, messageToSave);
      } else if (this.isSurveyRequest()) {
        await this.startFatMacysSurveyFlow(userInfo, messageToSave);
      } else if (this.isSample()) {
        const sampleVersion = this.body.Body.split("-")[1];
        await this.startSampleFlow(userInfo, messageToSave, sampleVersion);
      } else {
        await this.handleExistingFlow(userInfo, messageToSave);
      }
    } catch (err) {
      console.error(err);
      await this.flowManagerService.deleteFlowOnErr({
        userId: this.body.WaId,
        err,
      });
      this.res.status(500).send(err);
    }
  }
  //functions to select the flow to start based off the inbound message
  isGreeting() {
    return this.body.Body.toLowerCase().trim() === "hi";
  }

  isEditDetailsRequest() {
    return this.body.Body.toLowerCase().trim() === "edit details";
  }
  isSurveyRequest() {
    return this.body.Body.toLowerCase().trim() === "survey";
  }
  isSample() {
    return this.body.Body.toLowerCase().split("-")[0] === "sample";
  }
  /**
   * Starts a specific flow based on the user data and message information.
   *
   * @param {Object} params - Parameters for starting the flow.
   *
   * @param {Object} params.userInfo - The user data object.
   * @param {ObjectId} params.userInfo._id - Unique identifier for the user.
   * @param {string} params.userInfo.WaId - WhatsApp ID of the user.
   * @param {string} params.userInfo.username - Username of the user.
   * @param {string} params.userInfo.ProfileName - Profile name of the user.
   * @param {ObjectId} params.userInfo.organizationId - Identifier for the user's organization.
   * @param {Date} params.userInfo.CreatedAt - Timestamp when the user was created.
   * @param {Date} params.userInfo.LastSeenAt - Timestamp of the user's last activity.
   * @param {boolean} params.userInfo.isContactable - Whether the user is contactable.
   * @param {boolean} params.userInfo.isAnon - Indicates if the user is anonymous.
   * @param {boolean} params.userInfo.reminderSent - Whether a reminder has been sent to the user.
   *
   * @param {Object} params.messageToSave - The message to be saved in the database.
   * @param {ObjectId} params.messageToSave.OrganizationId - Identifier for the organization related to the message.
   * @param {string} params.messageToSave.SmsMessageSid - SMS message SID.
   * @param {string} params.messageToSave.MessageSid - message SID (same as SMS).
   * @param {string} params.messageToSave.NumMedia - Number of media attachments.
   * @param {string} params.messageToSave.ProfileName - Profile name associated with the message.
   * @param {string} params.messageToSave.MessageType - Type of the message (e.g., "text").
   * @param {string} params.messageToSave.SmsSid - SMS SID for the message.
   * @param {string} params.messageToSave.WaId - WhatsApp ID associated with the message.
   * @param {string} params.messageToSave.SmsStatus - Status of the message (e.g., "received").
   * @param {string} params.messageToSave.Body - The content of the message.
   * @param {string} params.messageToSave.To - Recipient's phone number.
   * @param {string} params.messageToSave.From - Sender's phone number.
   * @param {Date} params.messageToSave.CreatedAt - Timestamp when the message was created.
   * @param {string} params.messageToSave.Direction - Direction of the message (e.g., "inbound").
   * @param {string} params.messageToSave.Status - Status of the message.
   *
   * @param {string} params.flowName - The name of the flow to start.
   *
   * @param {Object} [params.extraData] - Additional data to be passed when starting the flow.
   * @param {Object} params.extraData.userSelection - Data about the user's selection in the flow.
   * @param {number} params.extraData.userSelection.page - Page number in the flow.
   * @param {boolean} params.extraData.userSelection.endFlow - Whether the flow should end.
   *
   *@example
   * const userInfo = {
   *   _id: new ObjectId(),
   *   WaId: '-------',
   *   username: 'Daria',
   *   ProfileName: 'Daria',
   *   organizationId: new ObjectId(),
   *   CreatedAt: new Date('2024-10-09T11:38:51.412Z'),
   *   LastSeenAt: new Date('2024-10-29T16:54:00.594Z'),
   *   isContactable: true,
   *   isAnon: false,
   *   reminderSent: true
   * };
   *@example
   * const messageToSave = {
   *   OrganizationId: new ObjectId(),
   *   SmsMessageSid: '---',
   *   NumMedia: '0',
   *   ProfileName: 'Daria Naumova',
   *   MessageType: 'text',
   *   SmsSid: '---',
   *   WaId: '-------',
   *   SmsStatus: 'received',
   *   Body: 'hi',
   *   To: 'whatsapp:+44-----',
   *   MessagingServiceSid: '---',
   *   NumSegments: '1',
   *   ReferralNumMedia: '0',
   *   MessageSid: '---',
   *   AccountSid: '---',
   *   From: 'whatsapp:+-------',
   *   ApiVersion: '2010-04-01',
   *   CreatedAt: new Date('2024-10-30T17:00:54.739Z'),
   *   Direction: 'inbound',
   *   Status: 'received'
   * };
   *
   * const flowName = 'signposting';
   * const extraData = { userSelection: { page: 1, endFlow: false } };
   * High-level overview of Intermediate Steps:
   * - `createMessageData`: Builds message data for flow initiation.
   * - `createNewFlow`: Creates a new flow in Firestore.
   * - `databaseService.saveFlow`: Saves the flow data in the database.
   * - `postRequestService.make_request`: Sends the flow request to an external service.
   * - `databaseService.saveMessage`: Persists the message data in the database.
   * - `createTranscriptionTask`: Starts a transcription task if the message is audio.
   *
   * @returns {Promise<void>}
   */
  async startFlow({ userInfo, messageToSave, flowName, extraData }) {
    const trackedFlowId = uuidv4();
    const updatedMessageToSave = {
      ...messageToSave,
      Flow: flowName,
      trackedFlowId: trackedFlowId,
    };
    const messageData = await this.createMessageData({
      userInfo,
      flowName,
      trackedFlowId,
      flowStep: 1,
      flowSection: 1,
    });
    await this.flowManagerService.createNewFlow({ messageData, extraData });
    await this.databaseService.saveFlow({
      WaId: userInfo.WaId,
      trackedFlowId,
      flowName,
      clientSideTriggered: this.clientSideTriggered,
      organizationPhoneNumber: this.organizationPhoneNumber,
      isReminder: this.isReminder,
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

  /**
   * Onboards a new user by saving their data and initiating the onboarding flow.
   *
   * @param {Object} userInfo - The data of the user to be onboarded.
   * @param {Object} messageToSave - Message data to be saved to the database and used for onboarding.
   *
   * Calls:
   * - `databaseService.saveUser`: Saves the user data to the database.
   * - `startFlow`: Initiates the "onboarding" flow with the provided user and message data.
   *
   * @returns {Promise<void>} - Resolves when the user is successfully onboarded and the flow is started.
   */

  async onboardUser(userInfo, messageToSave) {
    await this.databaseService.saveUser(userInfo, this.organizationPhoneNumber);
    await this.startFlow({ userInfo, messageToSave, flowName: "onboarding" });
  }

  /**
   * Starts the signposting flow for the user.
   *
   * @param {Object} userInfo - The data of the user to start the flow for.
   * @param {Object} messageToSave - Message data to be used in the signposting flow.
   * @param {string} sampleVersion - Sets whether to start the class based (1) or function based (2) flow
   * Calls:
   * - `startFlow`: Starts the "sample" flow with sample version set.
   *
   * @returns {Promise<void>} - Resolves when the flow has been started.
   */
  async startSampleFlow(userInfo, messageToSave, sampleVersion) {
    await this.startFlow({
      userInfo,
      messageToSave,
      flowName: `sample-${sampleVersion}`,
    });
  }

  /**
   * Starts the signposting flow for the user.
   *
   * @param {Object} userInfo - The data of the user to start the flow for.
   * @param {Object} messageToSave - Message data to be used in the signposting flow.
   *
   * Calls:
   * - `startFlow`: Starts the "signposting" flow with `userSelection` extra data.
   *
   * @returns {Promise<void>} - Resolves when the flow has been started.
   */

  async startSignpostingFlow(userInfo, messageToSave) {
    const extraData = {
      userSelection: {
        page: 1,
        endFlow: false,
      },
    }; //extraData helps set up logic for the signposting flow (paginated results)
    await this.startFlow({
      userInfo,
      messageToSave,
      flowName: "signposting",
      extraData,
    });
  }

  /**
   * Starts the edit details flow for the user to update information.
   *
   * @param {Object} userInfo - The data of the user initiating the edit details flow.
   * @param {Object} messageToSave - Message data to be used in the edit details flow.
   *
   * Calls:
   * - `startFlow`: Starts the "edit-details" flow with `userDetailUpdate` extra data.
   *
   * @returns {Promise<void>} - Resolves when the flow has been started.
   */
  async startEditDetailsFlow(userInfo, messageToSave) {
    const extraData = {
      userDetailUpdate: {
        endFlow: false,
      },
    };
    await this.startFlow({
      userInfo,
      messageToSave,
      flowName: "edit-details",
      extraData,
    });
  }

  /**
   * Starts the survey flow for the user.
   *
   * @param {Object} userInfo - The data of the user to start the survey flow for.
   * @param {Object} messageToSave - Message data to be used in the survey flow.
   *
   * Calls:
   * - `startFlow`: Starts the "survey" flow without additional data.
   *
   * @returns {Promise<void>} - Resolves when the survey flow has been started.
   */
  async startFatMacysSurveyFlow(userInfo, messageToSave) {
    await this.startFlow({
      userInfo,
      messageToSave,
      flowName: "survey",
    });
  }
  /**
   *
   * Handles an existing flow for the user based on their current flow status.
   * This method retrieves the user's current flow and advances the flow step
   * based on user input or "See More Options" conditions (signposting specific).
   * @param {Object} userInfo - The user's data.
   * @param {Object} messageToSave - Message data to be saved.
   * Calls:
   *  - `getCurrentFlow`: retrieves the flow that the user is currently in from Firestore object
   *  - `createMessageData`: @see {@link createMessageData}
   *  - `databaseService.updateFlowStatus`: updates the flow status to "in_progress", if a flow already exists for the user that means that
   * the message recieved from the Twilio API is a response to an outbound message sent.
   *  - `processFlowResponse`: @see {@link processFlowResponse}
   *  -
   * @returns {Promise<void>}
   */
  async handleExistingFlow(userInfo, messageToSave) {
    const currentFlow = await this.flowManagerService.getCurrentFlow(userInfo);
    const { flowName, flowStep, id: flowId } = currentFlow;
    let updatedFlowStep = flowStep;
    if (!this.seeMoreOptionMessages.includes(this.body.Body)) {
      updatedFlowStep += 1; //Signposting flow specific bit of logic, advances the current flow step for all other flows, handles the pagination of search results in signposting
    }
    console.log("updated flow step", updatedFlowStep);
    const messageData = await this.createMessageData({
      userInfo,
      flowName,
      trackedFlowId: flowId,
      flowStep: updatedFlowStep,
      flowSection: 1,
    });
    await this.databaseService.updateFlowStatus(flowId, "in_progress");
    // Update flow start time if it's the initial step
    if (messageData.flowStep === 2 && messageData.flowSection === 1) {
      await this.databaseService.updateFlowStartTime(flowId);
    }
    // Handle flow-specific data updates based on the flow type, these methods are specific to each flow type so for handling any advanced logic you will likely need to add your own
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
      const updatedDoc = await this.flowManagerService.createNextSectionUpdate(
        this.body.WaId,
        buttonPayload
      );
      messageData.flowSection = updatedDoc.flowSection;
      messageData.flowStep = updatedDoc.flowStep;
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
  /**
   * Updates user's selection for signposting flow.
   * @param {string} flowId - The unique flow ID.
   * @param {number} currentFlowStep - The current step in the flow.
   * @returns {Promise<string>} - The updated user selection.
   */

  async updateUserSignpostingSelection(flowId, currentFlowStep) {
    const updatedDoc = await this.flowManagerService.updateUserSelection({
      flowId,
      flowStep: currentFlowStep,
      selectionValue: this.body.Body,
      seeMoreOptionMessages: this.seeMoreOptionMessages,
    });
    return updatedDoc?.userSelection;
  }
  /**
   * Updates user's details for the edit-details flow.
   * @param {string} flowId - The unique flow ID.
   * @param {number} currentFlowStep - The current step in the flow.
   * @returns {Promise<string>} - The updated user detail.
   */
  async updateUserDetail(flowId, currentFlowStep) {
    const updatedDoc = await this.flowManagerService.createUserDetailUpdate({
      flowId,
      flowStep: currentFlowStep,
      selectionValue: this.body.Body,
      addUpdateMessages: this.addUpdateMessages,
    });
    return updatedDoc?.userDetailUpdate;
  }

  /**
   * Handles survey cancellation based on user input.
   * @param {string} flowId - The unique flow ID.
   * @returns {Promise<string>} - The updated cancellation status.
   */
  async updateSurveyCancellation(flowId) {
    const updatedDoc = await this.flowManagerService.createCancelSurveyUpdate({
      flowId,
      selectionValue: this.body.ButtonPayload,
    });
    return updatedDoc.cancelSurvey;
  }

  /**
   * Processes the flow response by making an API request to the flow service.
   * Saves the response and checks if the flow is complete, then saves the message data.
   * @param {Object} params - Parameters for processing the flow response.
   * @param {string} params.flowName - The name of the flow.
   * @param {Object} params.messageToSave - The message data to save.
   * @param {Object} params.messageData - Data to include in the API request.
   * @param {string} params.flowId - The unique flow ID.
   * @returns {Promise<void>}
   */
  async processFlowResponse({ flowName, messageToSave, messageData, flowId }) {
    const response = await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );
    if (response.data.flowCompletionStatus) {
      await this.databaseService.updateFlowStatus(flowId, "completed");
      await this.flowManagerService.deleteFlowOnCompletion(flowId);
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

/**
 * Service for sending out outbound flows/messages from the control room.
 * @extends BaseMessageHandler
 */
class OutboundFlowHandler extends BaseMessageHandler {
  /**
   * Creates an instance of OutboundFlowHandler.
   * @param {Object} params - Parameters for the handler.
   * @param {Object} params.req - The HTTP request object.
   * @param {Object} params.res - The HTTP response object.
   * @param {string} params.organizationPhoneNumber - The organization phone number.
   * @param {Object} params.firestore - Firestore database instance.
   * @param {boolean} params.clientSideTriggered - Indicates if the request was triggered from the client side (true for this class).
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
  /**
   * Processes individual messages for a given contact from `contactList` sent from control room in request body.
   * @param {string} WaId - WhatsApp ID of the contact.
   * @param {string} ProfileName - Profile name of the contact.
   * @param {string} organizationPhoneNumber - Organization's phone number.
   * @throws Will throw an error if the flow is not sendable for the organization (configured in database, all information about the flow is sent in request body).
   */
  async handleBulkMessages(WaId, ProfileName, organizationPhoneNumber) {
    const registeredUser = await this.databaseService.getUser(
      WaId,
      organizationPhoneNumber
    );

    if (!this.flow.isSendable) {
      throw new Error("Flow not enabled for this organization");
    }
    const userInfo = registeredUser || {
      "WaId": WaId,
      "ProfileName": ProfileName,
    };
    await this.startFlow({ userInfo, flowName: this.flow.flowName });
    console.log(`Message sent to ${userInfo.ProfileName}`);
  }
  /**
   * Initializes a new flow for a given user and flow name.
   * @param {Object} params - The parameters for starting the flow.
   * @param {Object} params.userInfo - Information about the user.
   * @param {string} params.flowName - The name of the flow to start.
   */
  async startFlow({ userInfo, flowName }) {
    const trackedFlowId = uuidv4();
    const messageData = await this.createMessageData({
      userInfo,
      flowName,
      trackedFlowId,
      flowStep: 1,
      flowSection: 1,
    });
    //Here we don't save the message to the database as it is a request sent from the control room, not an inbound user message so this method doesnt call `databaseService.saveMessage`
    await this.databaseService.saveFlow({
      WaId: userInfo.WaId,
      trackedFlowId,
      flowName,
      clientSideTriggered: this.clientSideTriggered,
      isReminder: this.isReminder,
      organizationPhoneNumber: this.organizationPhoneNumber,
    });

    await this.flowManagerService.createNewFlow({ messageData });
    await this.postRequestService.make_request(
      `flows/${flowName}`,
      messageData
    );
  }
}

module.exports = {
  OutboundFlowHandler,
  InboundMessageHandler,
};
