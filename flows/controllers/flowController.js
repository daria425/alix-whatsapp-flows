const {
  OnboardingFlow,
  SignpostingFlow,
  EditDetailsFlow,
  FatMacysSurveyFlow,
} = require("../services/dn/Flows");
const { StepBasedFlow } = require("../services/samples/StepBasedFlow");
const { runStepBasedFlow2 } = require("../services/samples/runStepBasedFlow2");
const { SupportOptionService } = require("../services/dn/SupportOptionService");
const { ContactModel } = require("../models/ContactModel");
const { api_base } = require("../config/llm_api.config");
const { LLMService } = require("../services/dn/LLMService");

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
 * Executes the onboarding flow.
 *
 * @async
 * @function
 * @param {Object} params - Parameters for running the onboarding flow.
 * @param {Object} params.flowStep - The current step of the flow.
 * @param {Object} params.flowConstructorParams - Common parameters to initialize a flow.
 * @returns {Promise<boolean>} The completion status of the flow.
 */
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

/**
 * Executes the edit details flow for updating user information in Mongo.
 *
 * @async
 * @function
 * @param {Object} params - Parameters for running the edit details flow.
 * @param {Object} params.flowStep - The current step of the flow.
 * @param {Object} params.flowConstructorParams - Common parameters to initialize a flow.
 * @param {Object} params.userDetailUpdate - Object containing updated user details.
 * @returns {Promise<boolean>} The completion status of the flow.
 */
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
/**
 * Executes a sample step-based flow.
 *
 * @async
 * @function
 * @param {Object} params - Parameters for running the step-based flow.
 * @param {Object} params.flowConstructorParams - Common parameters to initialize a flow.
 * @param {Object} params.flowStep - The current step of the flow.
 * @returns {Promise<void>}
 */
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

/**
 * Main controller function that directs requests to the appropriate flow handler based on the flowName parameter.
 *
 * @async
 * @function
 * @param {Object} req - Express request object containing request parameters and body data.
 * @param {Object} res - Express response object for sending the flow completion status.
 * @param {function} next - Express middleware next function.
 */
async function flowController(req, res, next) {
  const db = req.app.locals.signpostingOptionsDb; //Database for signposting
  const controlRoomDb = req.app.locals.controlRoomDb; //Main message storage database
  //initialize flow completion status to send back to webhook API
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
    //get the current flow from request parameters sent from webhook API
    const flow = req.params.flowName;
    //initialize data management class that interacts with a MongoDB database to manage and retrieve contact information, messages, and other related data for a specific organization.
    /**
     * @see {@link ContactModel}
     */
    const contactModel = new ContactModel(
      controlRoomDb,
      startTime,
      organizationPhoneNumber
    );
    if (userMessage.Body === "OPT-OUT") {
      await contactModel.updateContact(userInfo.WaId, { "opted_in": false });
      return res.status(200).send({ flowCompletionStatus: true });
    }
    //create an object that stores all the necessary information utilized by all flows
    const flowConstructorParams = {
      contactModel,
      userInfo,
      flowStep,
      userMessage,
      organizationMessagingServiceSid,
      organizationPhoneNumber,
    };
    //determine function to run based on request params, each function uses the `flowConstructorParams` to initialize the relevant Flow service/handler class
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
    } else if (flow === "sample-1") {
      flowCompletionStatus = await runStepBasedFlow({
        flowConstructorParams,
        flowStep,
      });
    } else if (flow == "sample-2") {
      flowCompletionStatus = await runStepBasedFlow2({
        flowConstructorParams,
        flowStep,
        flowName: flow,
      });
    }
    res.status(200).send({ flowCompletionStatus });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
}

module.exports = { flowController };
