const {
  createNewFlow,
  getCurrentFlow,
  deleteFlowOnCompletion,
} = require("../helpers/firestore.helpers");
const { api_base } = require("../config/api_base.config");
const axios = require("axios");
const { getUser, saveUser } = require("../helpers/database.helpers");
const { firestore } = require("../config/firestore.config");
async function handleMessage(req, res, next) {
  try {
    const body = JSON.parse(JSON.stringify(req.body));
    console.log("recieved message", body);
    const waId = body.WaId;
    const profileName = body.ProfileName;
    const registeredUser = await getUser(waId);
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
      await saveUser(userData);
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
      await createNewFlow(firestore, {
        ...messageData,
        flowName: "signposting",
      });
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
      messageData.flowStep = currentFlow.flowStep + 1; //TO-DO: handle error here
      const flowName = currentFlow.flowName;
      const flowId = currentFlow.id;
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
    res.status(500).send("An error occurred", err);
  }
}

module.exports = {
  handleMessage,
};
