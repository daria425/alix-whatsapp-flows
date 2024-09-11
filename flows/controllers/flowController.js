const {
  OnboardingFlow,
  SignpostingFlow,
  EditDetailsFlow,
} = require("../services/Flows");
const { SupportOptionService } = require("../services/SupportOptionService");
const { ContactModel } = require("../models/ContactModel");
const { api_base } = require("../config/llm_api.config");
const { LLMService } = require("../services/LLMService");
async function runOnboardingFlow({
  db,
  contactModel,
  userInfo,
  flowStep,
  userMessage,
  organizationPhoneNumber,
}) {
  const onboardingFlow = new OnboardingFlow(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber
  );
  const flowCompletionStatus = await onboardingFlow.handleFlowStep(flowStep);
  return flowCompletionStatus;
}

async function runSignpostingFlow({
  db,
  contactModel,
  userInfo,
  flowStep,
  userMessage,
  organizationPhoneNumber,
  userSelection,
}) {
  const signpostingFlow = new SignpostingFlow(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber
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

async function runEditDetailsFlow({
  db,
  contactModel,
  userInfo,
  flowStep,
  userMessage,
  organizationPhoneNumber,
  userDetailUpdate,
}) {
  const editDetailsFlow = new EditDetailsFlow(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber
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
    const { userInfo, organizationPhoneNumber, message, flowStep, startTime } =
      req.body;
    if (process.env.NODE_ENV !== "production") {
      console.log("req body", req.body);
    }
    const flow = req.params.flowName;
    const contactModel = new ContactModel(controlRoomDb, startTime);
    await contactModel.updateContact(userInfo.WaId, {});
    if (flow === "onboarding") {
      flowCompletionStatus = await runOnboardingFlow({
        db,
        contactModel,
        userInfo,
        flowStep,
        userMessage: message,
        organizationPhoneNumber,
      });
    } else if (flow === "signposting") {
      const userSelection = req.body.userSelection;
      flowCompletionStatus = await runSignpostingFlow({
        db,
        contactModel,
        userInfo,
        flowStep,
        userMessage: message,
        organizationPhoneNumber,
        userSelection,
      });
    } else if (flow === "edit-details") {
      const userDetailUpdate = req.body?.userDetailUpdate;
      flowCompletionStatus = await runEditDetailsFlow({
        db,
        contactModel,
        userInfo,
        flowStep,
        userMessage: message,
        organizationPhoneNumber,
        userDetailUpdate,
      });
    }
    res.status(200).send({ flowCompletionStatus });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
}

module.exports = { flowController };
