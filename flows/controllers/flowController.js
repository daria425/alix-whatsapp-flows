const {
  createTextMessage,
  createTemplateMessage,
} = require("../helpers/messages.helpers");
const { sendMessage } = require("../helpers/twilio.helpers");
async function startOnboarding(waId) {
  const text = `Hello!

    Welcome to Alix Signposting.
    
    Alix signposts you to local and national help, starting in the region of Cornwall. You can find out more at https://www.projectalix.com/Cornwall
    
    Let's get started:
    Please respond with 'next' to continue.`;
  const message = createTextMessage(waId, text);
  await sendMessage(message);
}

async function flowController(req, res, next) {
  try {
    const { userInfo, message, flowStep } = req.body;
    const flow = req.params.flowName;
    console.log(flow, userInfo, flowStep);
    if (flow === "onboarding") {
      if (flowStep === 1) {
        await startOnboarding(userInfo.WaId);
      }
    }
    res.status(200).send("message sent to user");
  } catch (err) {
    res.status(500).send(err);
  }
}

module.exports = { flowController };
