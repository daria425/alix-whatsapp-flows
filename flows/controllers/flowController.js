const {
  OnboardingFlow,
  SignpostingFlow,
  EditDetailsFlow,
  FatMacysSurveyFlow,
} = require("../services/dn/Flows");
const { SampleFlow } = require("../services/samples/SampleFlow");
const { SupportOptionService } = require("../services/dn/SupportOptionService");
const { ContactModel } = require("../models/ContactModel");
const { api_base } = require("../config/llm_api.config");
const { LLMService } = require("../services/dn/LLMService");

async function runSurveyFlow({
  db,
  contactModel,
  userInfo,
  flowStep,
  userMessage,
  organizationPhoneNumber,
  organizationMessagingServiceSid,
  cancelSurvey,
  flowSection,
}) {
  const surveyFlow = new FatMacysSurveyFlow(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid
  );
  const flowCompletionStatus = await surveyFlow.handleFlowStep(
    flowStep,
    flowSection,
    cancelSurvey
  );
  return flowCompletionStatus;
}
async function runOnboardingFlow({
  db,
  contactModel,
  userInfo,
  flowStep,
  userMessage,
  organizationPhoneNumber,
  organizationMessagingServiceSid,
}) {
  const onboardingFlow = new OnboardingFlow(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid
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
  organizationMessagingServiceSid,
  userSelection,
}) {
  const signpostingFlow = new SignpostingFlow(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid
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
async function runSampleFlow({
  db,
  userInfo,
  userMessage,
  contactModel,
  organizationPhoneNumber,
  organizationMessagingServiceSid,
  flowStep,
}) {
  const sampleFlow = new SampleFlow(
    db,
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid
  );
  await sampleFlow.handleFlowStep(flowStep);
}
async function flowController(req, res, next) {
  const db = req.app.locals.db;
  const controlRoomDb = req.app.locals.secondaryDb;
  let flowCompletionStatus;
  try {
    const {
      userInfo,
      organizationPhoneNumber,
      message,
      flowStep,
      startTime,
      organizationMessagingServiceSid,
    } = req.body;
    if (process.env.NODE_ENV !== "production") {
      console.log("req body", req.body);
    }
    const flow = req.params.flowName;
    const contactModel = new ContactModel(
      controlRoomDb,
      startTime,
      organizationPhoneNumber
    );
    if (message.Body === "OPT-OUT") {
      await contactModel.updateContact(userInfo.WaId, { "opted_in": false });
      return res.status(200).send({ flowCompletionStatus: true });
    }
    if (flow === "onboarding") {
      flowCompletionStatus = await runOnboardingFlow({
        db,
        contactModel,
        userInfo,
        flowStep,
        userMessage: message,
        organizationMessagingServiceSid,
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
        organizationMessagingServiceSid,
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
        organizationMessagingServiceSid,
        userDetailUpdate,
      });
    } else if (flow === "survey") {
      const cancelSurvey = req.body.cancelSurvey;
      const flowSection = req.body.flowSection;
      flowCompletionStatus = await runSurveyFlow({
        db,
        contactModel,
        userInfo,
        flowStep,
        userMessage: message,
        organizationPhoneNumber,
        organizationMessagingServiceSid,
        cancelSurvey,
        flowSection,
      });
    } else if (flow === "sample") {
      flowCompletionStatus = await runSampleFlow({
        db,
        contactModel,
        userInfo,
        flowStep,
        userMessage: message,
        organizationMessagingServiceSid,
        organizationPhoneNumber,
      });
    }
    res.status(200).send({ flowCompletionStatus });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
}

module.exports = { flowController };
