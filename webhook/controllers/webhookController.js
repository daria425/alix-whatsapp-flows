const {
  createNewFlow,
  getCurrentFlow,
  deleteFlowOnCompletion,
  deleteFlowOnErr,
  updateUserSelection,
} = require("../helpers/firestore.helpers");
const { api_base } = require("../config/api_base.config");
const axios = require("axios");
const { getUser, saveUser } = require("../helpers/database.helpers");
const { firestore } = require("../config/firestore.config");
async function handleMessage(req, res, next) {
  const db = req.app.locals.db;
  const body = JSON.parse(JSON.stringify(req.body));
  const waId = body.WaId;
  const profileName = body.ProfileName;
  console.log("recieved message", body);
  try {
    const registeredUser = await getUser(db, waId);
    const userData = registeredUser || {
      "WaId": waId,
      "ProfileName": profileName,
    };

    const messageData = {
      userInfo: userData,
      message: body,
      flowStep: 1,
    };
    if (!registeredUser || body.Body === "test") {
      //first check, any message where the user is not registered gets forwarded to the onboarding flow
      await saveUser(db, userData);
      await createNewFlow(firestore, {
        ...messageData,
        flowName: "onboarding",
      }); //save the initialization of the flow to a temp db
      const response = await axios({
        headers: {
          "Content-Type": "application/json",
        },
        method: "post",
        url: `${api_base}flows/onboarding`,
        data: messageData,
      });
      res.status(200).send(response.data);
    } else if (body.Body.toLowerCase() === "hi") {
      await createNewFlow(
        firestore,
        {
          ...messageData,
          flowName: "signposting",
        },
        {
          userSelection: {
            page: 1,
          },
        }
      );
      const response = await axios({
        headers: {
          "Content-Type": "application/json",
        },
        method: "post",
        url: `${api_base}flows/signposting`,
        data: messageData,
      });
      res.status(200).send(response.data);
    } else {
      //check if a an active flow exists
      const currentFlow = await getCurrentFlow(firestore, userData);
      const currentFlowStep = currentFlow.flowStep;
      messageData.flowStep = currentFlowStep + 1; //TO-DO: handle error here
      const flowName = currentFlow.flowName;
      const flowId = currentFlow.id;
      if (flowName === "signposting") {
        const updatedDoc = await updateUserSelection(
          firestore,
          flowId,
          currentFlowStep,
          body.Body
        );
        messageData.userSelection = updatedDoc?.userSelection;
      }
      console.log("message to be sent", messageData);
      const response = await axios({
        headers: {
          "Content-Type": "application/json",
        },
        method: "post",
        url: `${api_base}flows/${flowName}`,
        data: messageData,
      });
      const flowCompletionStatus = response.data.flowCompletionStatus;
      if (flowCompletionStatus) {
        await deleteFlowOnCompletion(firestore, flowId);
      }
      res.status(200).send(response.data);
    }
  } catch (err) {
    console.log(err);
    await deleteFlowOnErr(firestore, waId, err);
    res.status(500).send(err);
  }
}

module.exports = {
  handleMessage,
};
