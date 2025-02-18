const { FieldValue } = require("firebase-admin/firestore");

/**
 * Service for managing user flow interactions in Firestore, creates new flows, manages existing ones and adding additional information based off button selection.
 */
class FlowManagerService {
  static SURVEY_CANCELLATION_MESSAGE = "cancel-survey";
  static FM_SURVEY_NEXT_SECTION_MESSAGE = "next_section";
  static SOCIAL_SURVEY_PATH_CONFIG = {
    "graduation-event": 3,
    "end-of-year-social&&graduation-event": 3,
    "end-of-year-social": 6,
    "!end-of-year-social&&!graduation-event": 10,
  };
  static SIGNPOSTING_CATEGORY_SELECTION_NAMES = {
    3: "category",
    4: "location",
  };
  static SIGNPOSTING_SEE_MORE_OPTIONS_MESSAGE = "see_more";
  static REPEAT_ENHAM_QA_MESSAGE = "yes-enham_qa";
  static ENHAM_SERVICE_OPTIONS = [
    "ask_questions",
    "training_and_quizzes",
    "documents_sign",
  ];
  static ENHAM_START_OVER_MESSAGE = "startover-enham_qa";
  static ENHAM_QUIZ_END_MESSAGE = "ask_questions-startover";
  static ENHAM_AVAILABILITY_CHANGE_MESSAGES = {
    "yes-availability_change": 1,
    "no-availability_change": 2,
    "no-postcode_change": 1,
    "no-distance_change": 1,
    "no-extra_update": 1,
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

  static getSectionUpdate(data, buttonPayload) {
    const NEXT_SECTION = 1;
    const PREV_SECTION = -1;
    const RESET_SECTION = 0;
    if (data.flowName === "survey") {
      if (
        buttonPayload.split("-")[1] ===
          FlowManagerService.FM_SURVEY_NEXT_SECTION_MESSAGE ||
        (data.flowSection == 2 && data.flowStep == 5) ||
        (data.flowSection == 3 && data.flowStep == 5) ||
        (data.flowSection == 4 && data.flowStep == 3) ||
        (data.flowSection == 5 && data.flowStep == 4) ||
        (data.flowSection == 6 && data.flowStep == 7)
      ) {
        return NEXT_SECTION;
      }
    } else if (data.flowName === "enham-quiz-shelter-moneyhelper") {
      if (buttonPayload === FlowManagerService.ENHAM_START_OVER_MESSAGE) {
        return PREV_SECTION;
      }
      if (buttonPayload === FlowManagerService.ENHAM_QUIZ_END_MESSAGE) {
        return RESET_SECTION;
      }
      if (data.flowSection === 1 && data.flowStep === 2) {
        return NEXT_SECTION;
      }
    } else if (data.flowName === "fm-social-survey") {
      if (data.flowStep === 3 || data.flowStep === 4 || data.flowStep === 5) {
        return NEXT_SECTION;
      }
    } else if (data.flowName === "enham-pa-register") {
      console.log(data.flowSection, data.flowStep, "to be updated");
      if (
        (data.flowSection === 1 && data.flowStep === 6) ||
        (data.flowSection === 2 && data.flowStep === 2) ||
        (data.flowSection === 3 && data.flowStep === 2) ||
        (data.flowSection === 4 && data.flowStep === 3) ||
        (data.flowSection === 5 && data.flowStep === 6) ||
        (data.flowSection === 6 && data.flowStep === 2) ||
        (data.flowSection === 7 && data.flowStep === 2) ||
        (data.flowSection === 8 && data.flowStep === 3)
      ) {
        return NEXT_SECTION;
      }
    } else if (data.flowName === "enham-pa-detail-check") {
      console.log("CURRENT STUFF", data.flowSection, data.flowStep);
      if (
        Object.keys(
          FlowManagerService.ENHAM_AVAILABILITY_CHANGE_MESSAGES
        ).includes(buttonPayload)
      ) {
        return FlowManagerService.ENHAM_AVAILABILITY_CHANGE_MESSAGES[
          buttonPayload
        ];
      }
      if (
        (data.flowSection === 2 && data.flowStep === 3) ||
        (data.flowSection === 3 && data.flowStep === 3) ||
        (data.flowSection === 4 && data.flowStep === 3) ||
        (data.flowSection === 5 && data.flowStep === 3)
      ) {
        return NEXT_SECTION;
      }
    }
    return null;
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
  async getCurrentFlow(userData, messageBody, buttonPayload) {
    //MOVE FLOW STEP INCREMENTING HERE
    try {
      console.log("button Payload in get current flow", buttonPayload);
      const userId = userData.WaId;
      const currentFlowSnapshot = await this.db
        .collection("flows")
        .where("userId", "==", userId)
        .get();
      if (!currentFlowSnapshot.empty) {
        const noFlowStepUpdate =
          FlowManagerService.SIGNPOSTING_SEE_MORE_OPTIONS_MESSAGE ===
          buttonPayload;
        const firstDoc = currentFlowSnapshot.docs[0];
        const data = firstDoc.data();
        const updateId = firstDoc.id;
        //TO-DO no just no, move to an array of static properties which will be messages for repeating or restarting
        const updatedFlowStep =
          FlowManagerService.REPEAT_ENHAM_QA_MESSAGE !== buttonPayload
            ? data.flowStep + 1
            : data.flowStep - 1;
        const hasBeenRestarted =
          FlowManagerService.ENHAM_START_OVER_MESSAGE == buttonPayload;
        data.id = updateId;
        if (!noFlowStepUpdate) {
          await this.db.collection("flows").doc(updateId).update({
            "flowStep": updatedFlowStep,
            "restarted": hasBeenRestarted,
          });
          //add the id to the doc so that we can delete it by id later
          data.flowStep = updatedFlowStep;
          data.restarted = hasBeenRestarted;
        }
        return data;
      }
      return null;
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

  async updateSignpostingSelection({
    flowId,
    flowSection,
    flowStep,
    selectionValue,
    buttonPayload,
  }) {
    const flowRef = this.db.collection("flows").doc(flowId);
    console.log(
      "the current data in update is",
      flowStep,
      selectionValue,
      buttonPayload
    );

    // Guard clause: If "See More Options" is selected, increment page and return updated doc
    if (
      buttonPayload === FlowManagerService.SIGNPOSTING_SEE_MORE_OPTIONS_MESSAGE
    ) {
      await flowRef.update({
        "userSelection.page": FieldValue.increment(1),
      });
      return (await flowRef.get()).data();
    }

    // Update based on flow section and step
    if (flowSection === 1) {
      const updateData = {};
      if (flowStep === 2) {
        updateData["userSelection.category_1"] = selectionValue;
        updateData["userSelection.page"] = 1;
      } else if (flowStep === 3) {
        updateData["userSelection.category_2"] = selectionValue;
      } else if (flowStep === 4) {
        updateData["userSelection.location"] = selectionValue;
      }

      if (Object.keys(updateData).length > 0) {
        await flowRef.update(updateData);
      }
    }

    return (await flowRef.get()).data();
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
  async createNextSectionUpdate({
    WaId,
    buttonPayload,
    additionalUpdates = {},
  }) {
    try {
      const currentFlowSnapshot = await this.db
        .collection("flows")
        .where("userId", "==", WaId)
        .get();
      if (!currentFlowSnapshot.empty) {
        const firstDoc = currentFlowSnapshot.docs[0];
        const data = firstDoc.data();
        const sectionChange = FlowManagerService.getSectionUpdate(
          data,
          buttonPayload
        );
        if (sectionChange === null) {
          return data;
        }
        const updateId = firstDoc.id;
        const updatePayload = {
          "flowStep": 1,
          "flowSection": data.flowSection + sectionChange,
          ...additionalUpdates,
        };
        await this.db.collection("flows").doc(updateId).update(updatePayload);
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
  /**
   * Routes the survey based on the current flow state and button payload.
   * @param {Object} params - Parameters for routing the survey.
   * @param {string} params.WaId - User's WhatsApp ID.
   * @param {number} params.flowStep - Current flow step.
   * @param {string} params.userSelection - User's selection value.
   * @param {string} params.buttonPayload - Payload data from the button selection.
   * @returns {Promise<Object|null>} Updated flow data or null if no changes.
   * @throws Will throw an error if any operation fails.
   */
  async routeSurvey({ WaId, flowStep, userSelection, buttonPayload }) {
    try {
      const currentFlowSnapshot = await this.db
        .collection("flows")
        .where("userId", "==", WaId)
        .get();

      if (currentFlowSnapshot.empty) {
        console.warn(`No flow found for user: ${WaId}`);
        return null;
      }

      const firstDoc = currentFlowSnapshot.docs[0];
      const flowData = firstDoc.data();
      const flowDocRef = this.db.collection("flows").doc(firstDoc.id);

      if (!FlowManagerService.getSectionUpdate(flowData, buttonPayload)) {
        return flowData; // No increment conditions met, return the current flow data.
      }

      let updatedFlowData = { ...flowData };
      //TO-DO clean this ew
      if (flowStep === 3) {
        const newStep =
          FlowManagerService.SOCIAL_SURVEY_PATH_CONFIG[userSelection];
        if (newStep) {
          await flowDocRef.update({ flowStep: newStep });
          updatedFlowData.flowStep = newStep;
        }
      } else if (flowStep === 4) {
        if (buttonPayload.split("-")[0] === "no") {
          await flowDocRef.update({ flowStep: 5 });
          updatedFlowData.flowStep = 5;
        }
      } else if (flowStep === 5) {
        await flowDocRef.update({ flowStep: 6 });
        updatedFlowData.flowStep = 6;
      }

      return updatedFlowData;
    } catch (err) {
      console.error("Error in routeSurvey:", err);
      throw new Error("Failed to route survey");
    }
  }

  async createEnhamServiceSelection({ flowId, buttonPayload = "" }) {
    const flowRef = this.db.collection("flows").doc(flowId);
    const serviceSelection = buttonPayload.split("-")[0];
    console.log(serviceSelection);
    if (!FlowManagerService.ENHAM_SERVICE_OPTIONS.includes(serviceSelection)) {
      const currentData = await flowRef.get();
      return currentData.data();
    }
    await flowRef.update({ serviceSelection });
    const updatedDoc = await flowRef.get();

    return updatedDoc.data();
  }
}

//TO-DO remove duplicate db calls
module.exports = {
  FlowManagerService,
};
