const {
  createTextMessage,
  createTemplateMessage,
} = require("../helpers/messages.helpers");
const { sendMessage } = require("../helpers/twilio.helpers");
const { updateUser } = require("../helpers/database.helpers");
async function runOnboardingFlow(userInfo, flowStep, userMessage, mongoClient) {
  const waId = userInfo.WaId;
  const messageContent = userMessage?.Body;
  const onBoardingTexts = {
    1: `Hello!\n\nWelcome to Alix Signposting.\n\nAlix signposts you to local and national help, starting in the region of Cornwall. You can find out more at https://www.projectalix.com/Cornwall\n\nLet's get started:\nPlease enter 'next' to continue.`,
    2: `Step 1 of 3: To begin, what is your name?`, //update name
    3: `Nice to meet you!\nStep 2 of 3: To ensure we have the right information, could you share the name of the organisation you work for?`, //update organization
    4: `Step 3 of 3: Great, to better assist you could you let us know the postcode you will be seeking support around?`, //update postcode
    5: `Thank you for sharing.\nBy continuing you agree to our privacy policy, which can be viewed here:\nhttps://www.projectalix.com/privacy\nDo you agree to proceed with assistance?\nPlease enter 'consent' to continue.`, //opted in, completed_onboarding =true
  };
  const text = onBoardingTexts[flowStep] || "flow complete";
  const message = createTextMessage(waId, text);
  if (flowStep === 3) {
    await updateUser(mongoClient, waId, { "username": messageContent });
  }
  if (flowStep === 4) {
    await updateUser(mongoClient, waId, { "organization": messageContent });
  }
  if (flowStep === 5) {
    await updateUser(mongoClient, waId, { "postcode": messageContent });
  }
  if (flowStep === 6) {
    await updateUser(mongoClient, waId, {
      "completed_onboarding": true,
      "opted_in": true,
    });
  }
  await sendMessage(message);
}

async function flowController(req, res, next) {
  const mongoClient = req.app.locals.mongoClient;
  try {
    const { userInfo, message, flowStep } = req.body;
    const flow = req.params.flowName;
    console.log(flow, userInfo, flowStep);
    if (flow === "onboarding") {
      runOnboardingFlow(userInfo, flowStep, message, mongoClient);
    }
    res.status(200).send("message sent to user");
  } catch (err) {
    res.status(500).send(err);
  }
}

module.exports = { flowController };
