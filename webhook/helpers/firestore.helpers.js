const { FieldValue } = require("firebase-admin/firestore");
async function createNewFlow({ db, messageData, extraData }) {
  try {
    const startTime = new Date().toISOString();
    const { flowName, userInfo, flowStep, userMessage, flowSection } =
      messageData;
    console.log("firestore recieved", messageData);
    const userId = userInfo.WaId;
    const existingFlowSnapshot = await db
      .collection("flows")
      .where("userId", "==", userId)
      .get();

    if (!existingFlowSnapshot.empty) {
      const batch = db.batch();
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
    console.log("reached 2");
    extraData = extraData || {};
    const data = {
      startTime,
      flowName,
      userId,
      flowStep,
      flowSection,
      ...extraData,
    };
    await db.collection("flows").doc(userMessage.trackedFlowId).set(data);
  } catch (error) {
    console.error("Error creating flow:", error);
    throw new Error("Failed to create new flow");
  }
}

async function getCurrentFlow(db, userData) {
  try {
    const userId = userData.WaId;
    const currentFlowSnapshot = await db
      .collection("flows")
      .where("userId", "==", userId)
      .get();
    if (!currentFlowSnapshot.empty) {
      const firstDoc = currentFlowSnapshot.docs[0]; //TO-DO: get the most recent flow here
      const data = firstDoc.data();
      const updateId = firstDoc.id;
      const currentStep = data.flowStep;
      await db
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

async function deleteFlowOnCompletion(db, flowId) {
  await db.collection("flows").doc(flowId).delete();
  console.log(`flow ${flowId} completed and deleted successfully`);
}

async function deleteFlowOnErr({ db, userId, err }) {
  const currentFlowSnapshot = await db
    .collection("flows")
    .where("userId", "==", userId)
    .get();
  if (!currentFlowSnapshot.empty) {
    const deletePromises = currentFlowSnapshot.docs.map((doc) =>
      db.collection("flows").doc(doc.id).delete()
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
async function updateUserSelection({
  db,
  flowId,
  flowStep,
  selectionValue,
  seeMoreOptionMessages,
}) {
  const selectionNames = {
    2: "category",
    3: "location",
  };
  const flowRef = db.collection("flows").doc(flowId);
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

async function createUserDetailUpdate({
  db,
  flowId,
  flowStep,
  selectionValue,
  addUpdateMessages,
}) {
  const runNextStep = !addUpdateMessages.includes(selectionValue);
  const updateQueryFields = {
    1: "detailField",
    2: "detailValue",
  };
  const flowRef = db.collection("flows").doc(flowId);
  if (selectionValue === addUpdateMessages[0]) {
    await flowRef.update({
      flowStep: 1,
      userDetailUpdate: FieldValue.delete(),
    });
  }
  if (selectionValue === addUpdateMessages[1]) {
    await flowRef.update({
      "userDetailUpdate.endFlow": true,
    });
  }
  if (updateQueryFields[flowStep] && runNextStep) {
    await flowRef.update({
      [`userDetailUpdate.${updateQueryFields[flowStep]}`]: selectionValue,
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
async function createCancelSurveyUpdate({ db, flowId, selectionValue }) {
  const cancelSurvey = selectionValue === "cancel-survey";
  const flowRef = db.collection("flows").doc(flowId);
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

async function createNextSectionUpdate(db, WaId, buttonPayload) {
  try {
    const currentFlowSnapshot = await db
      .collection("flows")
      .where("userId", "==", WaId)
      .get();
    if (!currentFlowSnapshot.empty) {
      const firstDoc = currentFlowSnapshot.docs[0];
      const data = firstDoc.data();
      const nextSection =
        buttonPayload.split("-")[1] === "next_section" ||
        (data.flowSection == 2 && data.flowStep == 5) ||
        (data.flowSection == 3 && data.flowStep == 5) ||
        (data.flowSection == 4 && data.flowStep == 3) ||
        (data.flowSection == 5 && data.flowStep == 4) ||
        (data.flowSection == 6 && data.flowStep == 7);
      if (!nextSection) {
        return data;
      }
      const updateId = firstDoc.id;
      const currentSection = data.flowSection;
      await db
        .collection("flows")
        .doc(updateId)
        .update({ "flowStep": 1, "flowSection": currentSection + 1 });
      const updatedDoc = await db.collection("flows").doc(updateId).get();
      return updatedDoc.data();
    }
  } catch (err) {
    console.error("An error occurred getting the current flow", err);
    throw new Error("Error in getting current flow");
  }
}
module.exports = {
  createNewFlow,
  getCurrentFlow,
  deleteFlowOnCompletion,
  updateUserSelection,
  deleteFlowOnErr,
  createUserDetailUpdate,
  createCancelSurveyUpdate,
  createNextSectionUpdate,
};
