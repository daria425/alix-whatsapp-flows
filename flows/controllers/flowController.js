const {
  OnboardingFlow,
  SignpostingFlow,
  EditDetailsFlow,
} = require("../services/Flows");
const { SupportOptionService } = require("../services/SupportOptionService");
const { ContactModel } = require("../models/ContactModel");
const { api_base } = require("../config/llm_api.config");
const { LLMService } = require("../services/LLMService");
async function runOnboardingFlow(
  db,
  controlRoomDb,
  userInfo,
  flowStep,
  userMessage
) {
  const contactModel = new ContactModel(controlRoomDb);
  const onboardingFlow = new OnboardingFlow(
    db,
    userInfo,
    userMessage,
    contactModel
  );
  const flowCompletionStatus = await onboardingFlow.handleFlowStep(flowStep);
  return flowCompletionStatus;
}

async function runSignpostingFlow(
  db,
  controlRoomDb,
  userInfo,
  flowStep,
  userMessage,
  userSelection
) {
  const contactModel = new ContactModel(controlRoomDb);
  const signpostingFlow = new SignpostingFlow(
    db,
    userInfo,
    userMessage,
    contactModel
  );
  const supportOptionService = new SupportOptionService(db);
  const llmService = new LLMService(api_base);
  const flowCompletionStatus = await signpostingFlow.handleFlowStep(
    flowStep,
    userSelection,
    supportOptionService,
    llmService
  );
  return flowCompletionStatus;
}

async function runEditDetailsFlow(
  db,
  controlRoomDb,
  userInfo,
  flowStep,
  userMessage,
  userDetailUpdate
) {
  const contactModel = new ContactModel(controlRoomDb);
  const editDetailsFlow = new EditDetailsFlow(
    db,
    userInfo,
    userMessage,
    contactModel
  );
  const flowCompletionStatus = await editDetailsFlow.handleFlowStep(
    flowStep,
    userDetailUpdate
  );
  return flowCompletionStatus;
}
async function flowController(req, res, next) {
  const db = req.app.locals.db;
  const controlRoomDb = req.app.locals.secondaryDb;
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
        controlRoomDb,
        userInfo,
        flowStep,
        message
      );
    } else if (flow === "signposting") {
      const userSelection = req.body.userSelection;
      flowCompletionStatus = await runSignpostingFlow(
        db,
        controlRoomDb,
        userInfo,
        flowStep,
        message,
        userSelection
      );
    } else if (flow === "edit-details") {
      const userDetailUpdate = req.body?.userDetailUpdate;
      flowCompletionStatus = await runEditDetailsFlow(
        db,
        controlRoomDb,
        userInfo,
        flowStep,
        message,
        userDetailUpdate
      );
    }
    res.status(200).send({ flowCompletionStatus });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
}

module.exports = { flowController };
