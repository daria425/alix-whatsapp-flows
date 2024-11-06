const {
  OnboardingFlow,
  SignpostingFlow,
  EditDetailsFlow,
  FatMacysSurveyFlow,
} = require("../services/dn/Flows");
const { StepBasedFlow } = require("../services/samples/StepBasedFlow");
const { SupportOptionService } = require("../services/dn/SupportOptionService");
const { ContactModel } = require("../models/ContactModel");
const { api_base } = require("../config/llm_api.config");
const { LLMService } = require("../services/dn/LLMService");

async function runSurveyFlow({
  flowConstructorParams,
  flowStep,
  cancelSurvey,
  flowSection,
}) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const surveyFlow = new FatMacysSurveyFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const flowCompletionStatus = await surveyFlow.handleFlowStep(
    flowStep,
    flowSection,
    cancelSurvey
  );
  return flowCompletionStatus;
}
async function runOnboardingFlow({ flowStep, flowConstructorParams }) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const onboardingFlow = new OnboardingFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const flowCompletionStatus = await onboardingFlow.handleFlowStep(flowStep);
  return flowCompletionStatus;
}

async function runSignpostingFlow({
  db,
  flowConstructorParams,
  flowStep,
  userSelection,
}) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const signpostingFlow = new SignpostingFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
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
  flowStep,
  flowConstructorParams,
  userDetailUpdate,
}) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const editDetailsFlow = new EditDetailsFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const flowCompletionStatus = await editDetailsFlow.handleFlowStep(
    flowStep,
    userDetailUpdate
  );
  return flowCompletionStatus;
}
async function runStepBasedFlow({ flowConstructorParams, flowStep }) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const stepBasedFlow = new StepBasedFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  await stepBasedFlow.handleFlowStep(flowStep);
}
async function flowController(req, res, next) {
  const db = req.app.locals.db;
  const controlRoomDb = req.app.locals.secondaryDb;
  let flowCompletionStatus;
  try {
    const {
      userInfo,
      organizationPhoneNumber,
      userMessage,
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
    if (userMessage.Body === "OPT-OUT") {
      await contactModel.updateContact(userInfo.WaId, { "opted_in": false });
      return res.status(200).send({ flowCompletionStatus: true });
    }
    const flowConstructorParams = {
      contactModel,
      userInfo,
      flowStep,
      userMessage,
      organizationMessagingServiceSid,
      organizationPhoneNumber,
    };
    if (flow === "onboarding") {
      flowCompletionStatus = await runOnboardingFlow({
        flowStep,
        flowConstructorParams,
      });
    } else if (flow === "signposting") {
      const userSelection = req.body.userSelection;
      flowCompletionStatus = await runSignpostingFlow({
        db,
        flowConstructorParams,
        flowStep,
        userSelection,
      });
    } else if (flow === "edit-details") {
      const userDetailUpdate = req.body?.userDetailUpdate;
      flowCompletionStatus = await runEditDetailsFlow({
        flowConstructorParams,
        flowStep,
        userDetailUpdate,
      });
    } else if (flow === "survey") {
      const cancelSurvey = req.body.cancelSurvey;
      const flowSection = req.body.flowSection;
      flowCompletionStatus = await runSurveyFlow({
        flowConstructorParams,
        flowStep,
        cancelSurvey,
        flowSection,
      });
    } else if (flow === "sample") {
      flowCompletionStatus = await runStepBasedFlow({
        flowConstructorParams,
        flowStep,
      });
    }
    res.status(200).send({ flowCompletionStatus });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
}

module.exports = { flowController };
