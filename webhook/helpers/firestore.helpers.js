const { v4: uuidv4 } = require("uuid");

async function createNewFlow(db, flowData) {
  const flowId = uuidv4();
  const startTime = new Date().toISOString();
  const { flowName, userInfo, flowStep } = flowData;
  const userId = userInfo.WaId;
  const data = {
    startTime,
    flowName,
    userId,
    flowStep,
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
    const firstDoc = currentFlowSnapshot.docs[0];
    const data = firstDoc.data();
    const updateId = firstDoc.id;
    const currentStep = data.flowStep;
    await db
      .collection("flows")
      .doc(updateId)
      .update({ "flowStep": currentStep + 1 });
    return data;
  }
}

module.exports = {
  createNewFlow,
  getCurrentFlow,
};
