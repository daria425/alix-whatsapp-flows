const { createNewFlow } = require("../helpers/firestore.helpers");
const apiBase = process.env.API_BASE;
const { axios } = require("axios");
const { getUser } = require("../helpers/database.helpers");
async function handleMessage(req, res, next) {
  const mongoClient = req.app.localc.mongoClient;
  try {
    const body = JSON.parse(JSON.stringify(req.body));
    console.log("recieved message", body);
    const recipient = body.WaId;
    const messageType = body.MessageType;
    const messageBody = body.Body;
    const recipientProfileName = body.ProfileName;
    const registeredUser = await getUser(mongoClient, recipient);

    const userData = registeredUser || {
      "WaId": recipient,
      "ProfileName": recipientProfileName,
    };
    if (!registeredUser) {
      //first check, any message where the user is not registered gets forwarded to the onboarding flow
      const flowData = {
        userInfo: userData,
        flow: "onboarding",
      };
      //await saveUser(userData)
      await createNewFlow(); //save the initialization of the flow to a temp db
      const response = await axios({
        method: "post",
        url: `${apiBase}flows`,
        flowData,
        params: {
          flow: "onboarding",
        },
      });
      res.status(200).send(response);
    } else {
      //check if a an active flow exists
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("An error occurred", err);
  }
}

module.exports = {
  handleMessage,
};
