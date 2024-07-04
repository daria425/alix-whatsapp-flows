const { v4: uuidv4 } = require("uuid");
const { Timestamp } = require("firebase-admin/firestore");
async function createNewFlow(db, flowData) {
  const flowId = uuidv4();
  const startTime = Timestamp.fromDate(Date.now());
  const { flow, userInfo } = flowData;
  const userId = userInfo.WaId;
  const data = {
    startTime,
    flow,
    userId,
  };
  await db.collection("flows").doc(flowId).set(data);
}

async function getCurrentFlow(db, userData) {
  const userId = userData.WaId;
  const flowRef = db.collection("flows").where("userId", "==", userId).get();
  console.log(flowRef);
}

module.exports = {
  createNewFlow,
  getCurrentFlow,
};
