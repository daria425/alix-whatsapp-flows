const { v4: uuidv4 } = require("uuid");
const { FieldValue } = require("firebase-admin/firestore");
async function createNewFlow(db, flowData, additionalProps = {}) {
  // TO-DO check for existing flow here and remove if exists
  const flowId = uuidv4();
  const startTime = new Date().toISOString();
  const { flowName, userInfo, flowStep } = flowData;
  const userId = userInfo.WaId;
  const existingFlowSnapshot = await db
    .collection("flows")
    .where("userId", "==", userId)
    .get();
  if (!existingFlowSnapshot.empty) {
    const batch = db.batch();
    existingFlowSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }
  const data = {
    startTime,
    flowName,
    userId,
    flowStep,
    ...additionalProps,
  };
  await db.collection("flows").doc(flowId).set(data);
}

async function getCurrentFlow(db, userData) {
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
}

async function deleteFlowOnCompletion(db, flowId) {
  await db.collection("flows").doc(flowId).delete();
  console.log(`flow ${flowId} completed and deleted successfully`);
}

async function deleteFlowOnErr(db, userId, err) {
  const currentFlowSnapshot = await db
    .collection("flows")
    .where("userId", "==", userId)
    .get();
  if (!currentFlowSnapshot.empty) {
    // Iterate through all the documents and delete them
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
async function updateUserSelection(
  db,
  flowId,
  flowStep,
  selectionValue,
  seeMoreOptionMessages
) {
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
module.exports = {
  createNewFlow,
  getCurrentFlow,
  deleteFlowOnCompletion,
  updateUserSelection,
  deleteFlowOnErr,
};
