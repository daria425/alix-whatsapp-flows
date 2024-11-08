const { FieldValue } = require("firebase-admin/firestore");

/**
 * Service for managing user flow interactions in Firestore, creates new flows, manages existing ones and adding additional information based off button selection.
 */
class FlowManagerService {
  /**
   * @static
   * @type {Array<string>}
   * @description Predefined messages when a user wants to update more details in edit-details flow
   */
  static ADD_UPDATE_MESSAGES = ["Yes", "No thanks"];
  /**
   * @static
   * @type {string}
   * @description A predefined message identifier that is used to cancel a survey.
   * This can be triggered by the user when they wish to stop or cancel the ongoing survey flow.
   */
  static SURVEY_CANCELLATION_MESSAGE = "cancel-survey";
  /**
   * @static
   * @type {string}
   * @description A predefined message identifier that signifies the user intends to move to the next section
   * of the flow. This is used to check if the flow should advance to the next part.
   */
  static NEXT_SECTION_MESSAGE = "next_section";
  /**
   * @static
   * @type {Object}
   * @description Predefined message identifiers for setting up a search in signposting flow.
   */
  static SIGNPOSTING_CATEGORY_SELECTION_NAMES = {
    2: "category",
    3: "location",
  };
  /**
   * @static
   * @type {Object}
   * @description Predefined configuration for conducting a user detail update.
   */
  static EDIT_DETAILS_QUERY_FIELDS = {
    1: "detailField",
    2: "detailValue",
  };
  /**
   * @static
   * @description Checks whether the conditions are met for moving to the next section in the flow.
   * The conditions check the `buttonPayload` and the current flow section and step to decide
   * if the flow should progress to the next step.
   *
   * @param {Object} data - The data object that contains the current state of the flow.
   * @param {number} data.flowSection - The current section of the flow.
   * @param {number} data.flowStep - The current step within the flow section.
   * @param {string} buttonPayload - The payload (ID) of the button click, which is expected to contain
   * information about whether the user is moving to the next section or performing another action.
   * @returns {boolean} - Returns `true` if the conditions for moving to the next section are met,
   *         otherwise returns `false`.
   */

  static incrementSectionConditions(data, buttonPayload) {
    return (
      buttonPayload.split("-")[1] === FlowManagerService.NEXT_SECTION_MESSAGE ||
      (data.flowSection == 2 && data.flowStep == 5) ||
      (data.flowSection == 3 && data.flowStep == 5) ||
      (data.flowSection == 4 && data.flowStep == 3) ||
      (data.flowSection == 5 && data.flowStep == 4) ||
      (data.flowSection == 6 && data.flowStep == 7)
    );
  }
  constructor(db) {
    /**
     * @constructor
     * @param {FirebaseFirestore.Firestore} db - Firestore database instance.
     */
    this.db = db;
  }
  /**
   * Creates a new flow document in Firestore. Deletes any existing flows for the user.
   * @param {Object} params - Parameters for creating a new flow.
   * @param {Object} params.messageData - Data related to the flow message.
   * @param {string} params.messageData.flowName - The name of the flow.
   * @param {Object} params.messageData.userInfo - User information.
   * @param {string} params.messageData.userInfo.WaId - User WhatsApp ID.
   * @param {number} params.messageData.flowStep - Current step in the flow.
   * @param {string} params.messageData.userMessage - Message data for the flow.
   * @param {number} params.messageData.flowSection - Section of the flow.
   * @param {Object} params.extraData - Optional extra data for flow creation.
   * @throws Will throw an error if flow creation fails.
   */
  async createNewFlow({ messageData, extraData }) {
    try {
      const startTime = new Date().toISOString();
      const { flowName, userInfo, flowStep, userMessage, flowSection } =
        messageData;
      console.log("firestore recieved", messageData);
      const userId = userInfo.WaId;
      const existingFlowSnapshot = await this.db
        .collection("flows")
        .where("userId", "==", userId)
        .get();
      //Deletes any existing flows here to avoid duplication
      if (!existingFlowSnapshot.empty) {
        const batch = this.db.batch();
        existingFlowSnapshot.forEach((doc) => {
          console.log(`Deleting document with id: ${doc.id}`);
          batch.delete(doc.ref);
        });
        console.log("Committing batch deletion...");
        await batch.commit();
        console.log("Batch commit successful");
      } else {
        console.log("No existing flows found for user:", userId);
      }
      extraData = extraData || {};
      const data = {
        startTime,
        flowName,
        userId,
        flowStep,
        flowSection,
        ...extraData,
      };
      await this.db
        .collection("flows")
        .doc(userMessage.trackedFlowId)
        .set(data);
    } catch (error) {
      console.error("Error creating flow:", error);
      throw new Error("Failed to create new flow");
    }
  }
  /**
   * Retrieves the current flow for a user and increments the flow step.
   * @param {Object} userData - User data.
   * @param {string} userData.WaId - User WhatsApp ID.
   * @returns {Promise<Object|null>} The current flow data or null if no flow exists.
   * @throws Will throw an error if retrieving the flow fails.
   */
  async getCurrentFlow(userData) {
    try {
      const userId = userData.WaId;
      const currentFlowSnapshot = await this.db
        .collection("flows")
        .where("userId", "==", userId)
        .get();
      if (!currentFlowSnapshot.empty) {
        const firstDoc = currentFlowSnapshot.docs[0];
        const data = firstDoc.data();
        const updateId = firstDoc.id;
        const currentStep = data.flowStep;
        await this.db
          .collection("flows")
          .doc(updateId)
          .update({ "flowStep": currentStep + 1 });
        data.id = updateId; //add the id to the doc so that we can delete it by id later
        return data;
      }
    } catch (err) {
      console.error("An error occurred getting the current flow", err);
      throw new Error("Error in getting current flow");
    }
  }

  /**
   * Deletes a flow document by its ID upon completion (when flowCompletionStatus: true is recieved from flows API).
   * @param {string} flowId - The ID of the flow document to delete.
   * @returns {Promise<void>} Resolves when the flow is deleted.
   */
  async deleteFlowOnCompletion(flowId) {
    await this.db.collection("flows").doc(flowId).delete();
    console.log(`flow ${flowId} completed and deleted successfully`);
  }

  /**
   * Deletes all flows for a user if an error occurs.
   * @param {Object} params - Parameters for error handling.
   * @param {string} params.userId - User ID.
   * @param {string} params.err - Error message.
   * @returns {Promise<Object>} Message about deletion status.
   */
  async deleteFlowOnErr({ userId, err }) {
    const currentFlowSnapshot = await this.db
      .collection("flows")
      .where("userId", "==", userId)
      .get();
    if (!currentFlowSnapshot.empty) {
      const deletePromises = currentFlowSnapshot.docs.map((doc) =>
        this.db.collection("flows").doc(doc.id).delete()
      );
      // Wait for all delete operations to complete
      await Promise.all(deletePromises);
      return {
        message: `All flows for user with id ${userId} deleted because of error: ${err}`,
      };
    } else {
      return { message: "No documents found for the specified userId" };
    }
  }

  /**
   * Updates user selection within a flow and optionally advances the flow step.
   * @param {Object} params - Parameters for selection update.
   * @param {string} params.flowId - The flow ID.
   * @param {number} params.flowStep - Current step in the flow.
   * @param {string} params.selectionValue - User selection value.
   * @param {Array<string>} params.seeMoreOptionMessages - Options for selection behavior.
   * @returns {Promise<Object|null>} Updated document data or null if not found.
   * @see {@link ../handlers/MessageHandlers.js~InboundMessageHandler#updateUserSignpostingSelection}
   */
  async updateUserSelection({
    flowId,
    flowStep,
    selectionValue,
    seeMoreOptionMessages,
  }) {
    const selectionNames = {
      2: "category",
      3: "location",
    };
    const flowRef = this.db.collection("flows").doc(flowId);
    const runNextStep = !seeMoreOptionMessages.includes(selectionValue);
    if (selectionValue === seeMoreOptionMessages[0]) {
      await flowRef.update({
        "userSelection.page": FieldValue.increment(1),
      });
    } else if (selectionValue === seeMoreOptionMessages[1]) {
      await flowRef.update({
        "userSelection.endFlow": true,
      });
    }
    if (selectionNames[flowStep] && runNextStep) {
      await flowRef.update({
        [`userSelection.${selectionNames[flowStep]}`]: selectionValue,
      });

      console.log(
        `Document property update with values: ${selectionNames[flowStep]} : ${selectionValue}`
      );
    }
    const updatedDoc = await flowRef.get();

    if (updatedDoc.exists) {
      return updatedDoc.data(); // Return the data of the updated document
    } else {
      console.log("No such document!");
      return null; // Return null if the document does not exist
    }
  }

  /**
   * Updates user details within a flow based on their selection and adds optional data fields.
   * @param {Object} params - Parameters for detail update.
   * @param {string} params.flowId - The flow ID.
   * @param {number} params.flowStep - Current step in the flow.
   * @param {string} params.selectionValue - User's selected value.
   * @returns {Promise<Object|null>} Updated document data or null if not found.
   * @see {@link ../handlers/MessageHandlers.js~InboundMessageHandler#updateUserDetail}
   */

  async createUserDetailUpdate({ flowId, flowStep, selectionValue }) {
    const runNextStep =
      !FlowManagerService.ADD_UPDATE_MESSAGES.includes(selectionValue); //User does not want to update anything else, TO-DO: refactor to use button Id
    const flowRef = this.db.collection("flows").doc(flowId);
    if (selectionValue === FlowManagerService.ADD_UPDATE_MESSAGES[0]) {
      await flowRef.update({
        flowStep: 1,
        userDetailUpdate: FieldValue.delete(),
      });
    }
    if (selectionValue === FlowManagerService.ADD_UPDATE_MESSAGES[1]) {
      await flowRef.update({
        "userDetailUpdate.endFlow": true,
      });
    }
    if (FlowManagerService.EDIT_DETAILS_QUERY_FIELDS[flowStep] && runNextStep) {
      await flowRef.update({
        [`userDetailUpdate.${FlowManagerService.EDIT_DETAILS_QUERY_FIELDS[flowStep]}`]:
          selectionValue,
      });
    }
    const updatedDoc = await flowRef.get();

    if (updatedDoc.exists) {
      return updatedDoc.data(); // Return the data of the updated document
    } else {
      console.log("No such document!");
      return null; // Return null if the document does not exist
    }
  }

  /**
   * Marks a survey as canceled if the specified selection matches a "cancel" value.
   * @param {Object} params - Parameters for survey cancellation.
   * @param {string} params.flowId - Flow ID.
   * @param {string} params.selectionValue - Selection value triggering cancellation (ButtonId in twilio).
   * @returns {Promise<Object|null>} Updated document data or null if not found.
   */
  async createCancelSurveyUpdate({ flowId, selectionValue }) {
    const cancelSurvey =
      selectionValue === FlowManagerService.SURVEY_CANCELLATION_MESSAGE;
    const flowRef = this.db.collection("flows").doc(flowId);
    if (cancelSurvey) {
      await flowRef.update({
        "cancelSurvey": true,
      });
    }
    const updatedDoc = await flowRef.get();

    if (updatedDoc.exists) {
      return updatedDoc.data();
    } else {
      console.log("No such document!");
      return null;
    }
  }

  /**
   * Advances the flow to the next section based on the current flow state and button payload (button ID).
   * @param {string} WaId - WhatsApp ID of the user.
   * @param {string} buttonPayload - Payload data from the button selection.
   * @returns {Promise<Object|null>} Updated flow data or null if no changes.
   * @throws Will throw an error if the flow retrieval or update fails.
   */
  async createNextSectionUpdate(WaId, buttonPayload) {
    try {
      const currentFlowSnapshot = await this.db
        .collection("flows")
        .where("userId", "==", WaId)
        .get();
      if (!currentFlowSnapshot.empty) {
        const firstDoc = currentFlowSnapshot.docs[0];
        const data = firstDoc.data();
        const incrementSection = FlowManagerService.incrementSectionConditions(
          data,
          buttonPayload
        );
        if (!incrementSection) {
          return data;
        }
        const updateId = firstDoc.id;
        const currentSection = data.flowSection;
        await this.db
          .collection("flows")
          .doc(updateId)
          .update({ "flowStep": 1, "flowSection": currentSection + 1 });
        const updatedDoc = await this.db
          .collection("flows")
          .doc(updateId)
          .get();
        return updatedDoc.data();
      }
    } catch (err) {
      console.error("An error occurred getting the current flow", err);
      throw new Error("Error in getting current flow");
    }
  }
}

module.exports = {
  FlowManagerService,
};
