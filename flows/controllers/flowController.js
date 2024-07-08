const { OnboardingFlow, SignpostingFlow } = require("../services/Flows");

async function runOnboardingFlow(db, userInfo, flowStep, userMessage) {
  const onboardingFlow = new OnboardingFlow(db, userInfo, userMessage);
  const flowCompletionStatus = await onboardingFlow.handleFlowStep(flowStep);
  return flowCompletionStatus;
}

async function runSignpostingFlow(db, userInfo, flowStep, userMessage) {
  const signpostingFlow = new SignpostingFlow(db, userInfo, userMessage);
  const flowCompletionStatus = await signpostingFlow.handleFlowStep(flowStep);
  return flowCompletionStatus;
}
async function flowController(req, res, next) {
  const db = req.app.locals.db;
  let flowCompletionStatus;
  try {
    const { userInfo, message, flowStep } = req.body;
    const flow = req.params.flowName;
    console.log({
      flow: flow,
      userInfo: userInfo,
      flowStep: flowStep,
      message: message,
    });
    if (flow === "onboarding") {
      flowCompletionStatus = await runOnboardingFlow(
        db,
        userInfo,
        flowStep,
        message
      );
    } else if (flow === "signposting") {
      flowCompletionStatus = await runSignpostingFlow(
        db,
        userInfo,
        flowStep,
        message
      );
    }
    res.status(200).send({ flowCompletionStatus });
  } catch (err) {
    res.status(500).send(err);
  }
}

module.exports = { flowController };
