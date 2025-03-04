const {
  EnhamComboFlow,
  EnhamVideoDemoFlow,
  EnhamPARegisterFlow,
  EnhamDetailCheckFlow,
} = require("../flows/enhamFlows");
const { AlixSignpostingFlow } = require("../flows/alixFlows");
const { GoldingSignpostingFlow } = require("../flows/goldingFlows");
const { FMSocialSurveyFlow, FatMacysSurveyFlow } = require("../flows/fmFlows");
const { api_base } = require("../config/llm_api.config");
const { LLMService } = require("../services/LLMService");
const { SignpostingService } = require("../services/SignpostingService");

async function runFMSocialSurveyFlow({
  flowConstructorParams,
  flowStep,
  flowSection,
  cancelSurvey,
}) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const fmSocialSurveyFlow = new FMSocialSurveyFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const flowCompletionStatus = await fmSocialSurveyFlow.handleFlowStep(
    flowStep,
    flowSection,
    cancelSurvey
  );
  return flowCompletionStatus;
}

async function runEnhamPARegisterFlow({
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
  const enhamPaRegisterFlow = new EnhamPARegisterFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const flowCompletionStatus = await enhamPaRegisterFlow.handleFlowStep(
    flowStep,
    flowSection,
    cancelSurvey
  );
  return flowCompletionStatus;
}

async function runEnhamDetailCheckFlow({
  flowConstructorParams,
  flowStep,

  flowSection,
}) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const enhamDetailCheckFlow = new EnhamDetailCheckFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const flowCompletionStatus = await enhamDetailCheckFlow.handleFlowStep(
    flowStep,
    flowSection
  );
  return flowCompletionStatus;
}
async function runEnhamDemoFlow({
  flowConstructorParams,
  flowStep,
  flowSection,
}) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const enhamDemoFlow = new EnhamVideoDemoFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const flowCompletionStatus = await enhamDemoFlow.handleFlowStep(
    flowStep,
    flowSection
  );
  return flowCompletionStatus;
}
async function runEnhamComboFlow({
  flowConstructorParams,
  flowStep,
  flowSection,
  restarted,
  serviceSelection,
}) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const enhamComboFlow = new EnhamComboFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const llmService = new LLMService(api_base);
  const flowCompletionStatus = await enhamComboFlow.handleFlowStep(
    flowStep,
    flowSection,
    restarted,
    serviceSelection,
    llmService
  );
  return flowCompletionStatus;
}
/**
 * Executes the survey flow for a user interaction.
 * @async
 * @function
 * @param {Object} params - Parameters for running the survey flow.
 * @param {Object} params.flowConstructorParams - Common parameters to initialize a flow.
 * @param {Object} params.flowStep - The current step of the flow.
 * @param {boolean} params.cancelSurvey - Indicates if the survey should be canceled.
 * @param {string} params.flowSection - The section of the survey flow to be executed.
 * @returns {Promise<boolean>} The completion status of the flow.
 */

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

/**
 * Executes the signposting flow, providing options and signposts for user selections.
 *
 * @async
 * @function
 * @param {Object} params - Parameters for running the signposting flow.
 * @param {Object} params.db - Database instance.
 * @param {Object} params.flowConstructorParams - Common parameters to initialize a flow.
 * @param {Object} params.flowStep - The current step of the flow.
 * @param {string} params.userSelection - User-selected option within the flow.
 * @returns {Promise<boolean>} The completion status of the flow.
 */
async function runAlixSignpostingFlow({
  db,
  flowConstructorParams,
  flowStep,
  flowSection,
  userSelection,
}) {
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const signpostingFlow = new AlixSignpostingFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const signpostingService = new SignpostingService(db);
  const llmService = new LLMService(api_base);
  const flowCompletionStatus = await signpostingFlow.handleFlowStep({
    flowStep,
    flowSection,
    userSelection,
    signpostingService,
    llmService,
  });
  return flowCompletionStatus;
}

async function runGoldingSignpostingFlow({
  db,
  flowConstructorParams,
  flowStep,
  flowSection,
  userSelection,
}) {
  const signpostingService = new SignpostingService(db);
  const {
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  } = flowConstructorParams;
  const goldingSignpostingFlow = new GoldingSignpostingFlow({
    userInfo,
    userMessage,
    contactModel,
    organizationPhoneNumber,
    organizationMessagingServiceSid,
  });
  const llmService = new LLMService(api_base);
  const flowCompletionStatus = await goldingSignpostingFlow.handleFlowStep({
    flowStep,
    flowSection,
    userSelection,
    signpostingService,
    llmService,
  });
  return flowCompletionStatus;
}

module.exports = {
  runEnhamComboFlow,
  runAlixSignpostingFlow,
  runGoldingSignpostingFlow,
  runSurveyFlow,
  runFMSocialSurveyFlow,
  runEnhamDemoFlow,
  runEnhamPARegisterFlow,
  runEnhamDetailCheckFlow,
};
