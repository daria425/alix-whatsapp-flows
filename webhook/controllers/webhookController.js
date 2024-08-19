const {
  createNewFlow,
  getCurrentFlow,
  deleteFlowOnCompletion,
  deleteFlowOnErr,
  updateUserSelection,
  createUserDetailUpdate,
} = require("../helpers/firestore.helpers");
const { PostRequestService } = require("../services/PostRequestService");
const { api_base } = require("../config/api_base.config");
const { getUser, saveUser } = require("../helpers/database.helpers");
const { firestore } = require("../config/firestore.config");
async function handleMessage(req, res, next) {
  const postRequestService = new PostRequestService(api_base);
  const db = req.app.locals.db;
  const body = JSON.parse(JSON.stringify(req.body));
  const waId = body.WaId;
  const profileName = body.ProfileName;
  const organizationNumber = body.To;
  console.log("recieved message", body);
  const seeMoreOptionMessages = ["See More Options", "That's great, thanks"];
  const addUpdateMessages = ["Yes", "No thanks"];
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
      await saveUser(db, userData, organizationNumber);
      await createNewFlow(firestore, {
        ...messageData,
        flowName: "onboarding",
      }); //save the initialization of the flow to a temp db
      const response = await postRequestService.make_request(
        "flows/onboarding",
        messageData
      );
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
            endFlow: false,
          },
        }
      );
      const response = await postRequestService.make_request(
        "flows/signposting",
        messageData
      );
      res.status(200).send(response.data);
    } else if (body.Body.toLowerCase().trim() == "edit details") {
      await createNewFlow(
        firestore,
        {
          ...messageData,
          flowName: "edit-details",
        },
        {
          userDetailUpdate: {
            endFlow: false,
          },
        }
      );
      const response = await postRequestService.make_request(
        "flows/edit-details",
        messageData
      );
      res.status(200).send(response.data);
    } else {
      //check if a an active flow exists
      const currentFlow = await getCurrentFlow(firestore, userData);
      const currentFlowStep = currentFlow.flowStep;
      const flowName = currentFlow.flowName;
      const flowId = currentFlow.id;
      if (!seeMoreOptionMessages.includes(body.Body)) {
        messageData.flowStep = currentFlowStep + 1;
      } else {
        messageData.flowStep = currentFlowStep;
      }
      if (flowName === "signposting") {
        const updatedDoc = await updateUserSelection(
          firestore,
          flowId,
          currentFlowStep,
          body.Body,
          seeMoreOptionMessages
        );
        messageData.userSelection = updatedDoc?.userSelection;
      }
      if (flowName === "edit-details") {
        const updatedDoc = await createUserDetailUpdate(
          firestore,
          flowId,
          currentFlowStep,
          body.Body,
          addUpdateMessages
        );
        messageData.userDetailUpdate = updatedDoc?.userDetailUpdate;
      }
      console.log("message to be sent", messageData);
      const response = await postRequestService.make_request(
        `flows/${flowName}`,
        messageData
      );
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
