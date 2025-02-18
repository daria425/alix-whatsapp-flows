const {
  runEnhamComboFlow,
  runAlixSignpostingFlow,
  runGoldingSignpostingFlow,
  runSurveyFlow,
  runFMSocialSurveyFlow,
  runEnhamDemoFlow,
  runEnhamPARegisterFlow,
  runEnhamDetailCheckFlow,
} = require("../handlers/flowHandlers");
const { ContactModel } = require("../models/ContactModel");

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
  const controlRoomDB = req.app.locals.controlRoomDB; //Main message storage database
  //initialize flow completion status to send back to webhook API
  let flowCompletionStatus;
  try {
    const {
      userInfo,
      organizationPhoneNumber,
      userMessage,
      flowStep,
      startTime,
      flowSection,
      organizationMessagingServiceSid,
      cancelSurvey,
    } = req.body;
    if (process.env.NODE_ENV !== "production") {
      console.log("req bodyyyyyyyy", req.body);
    }
    //get the current flow from request parameters sent from webhook API
    const flow = req.params.flowName;
    //initialize data management class that interacts with a MongoDB database to manage and retrieve contact information, messages, and other related data for a specific organization.
    /**
     * @see {@link ContactModel}
     */
    const contactModel = new ContactModel(
      controlRoomDB,
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
    //To-DO add guard clause to check is flow enabled for organization
    if (flow === "signposting-alix") {
      const userSelection = req.body.userSelection;
      flowCompletionStatus = await runAlixSignpostingFlow({
        db: controlRoomDB,
        flowConstructorParams,
        flowStep,
        flowSection,
        userSelection,
      });
    } else if (flow === "survey") {
      flowCompletionStatus = await runSurveyFlow({
        flowConstructorParams,
        flowStep,
        cancelSurvey,
        flowSection,
      });
    } else if (flow === "fm-social-survey") {
      flowCompletionStatus = await runFMSocialSurveyFlow({
        flowConstructorParams,
        flowStep,
        flowSection,
        cancelSurvey,
      });
    } else if (flow === "enham-quiz-shelter-moneyhelper") {
      const serviceSelection = req.body.serviceSelection;
      const restarted = req.body.restarted;
      flowCompletionStatus = await runEnhamComboFlow({
        flowConstructorParams,
        flowStep,
        flowSection,
        restarted,
        serviceSelection,
      });
    } else if (flow === "enham-ai-video-demo") {
      flowCompletionStatus = await runEnhamDemoFlow({
        flowConstructorParams,
        flowStep,
        flowSection,
      });
    } else if (flow === "enham-pa-register") {
      flowCompletionStatus = await runEnhamPARegisterFlow({
        flowConstructorParams,
        flowStep,
        flowSection,
        cancelSurvey,
      });
    } else if (flow === "enham-pa-detail-check") {
      flowCompletionStatus = await runEnhamDetailCheckFlow({
        flowConstructorParams,
        flowStep,
        flowSection,
      });
    } else if (flow === "signposting-golding") {
      const userSelection = req.body.userSelection;
      flowCompletionStatus = await runGoldingSignpostingFlow({
        db: controlRoomDB,
        flowConstructorParams,
        flowStep,
        flowSection,
        userSelection,
      });
    }
    res.status(200).send({ flowCompletionStatus });
  } catch (err) {
    console.log(err);
    res.status(500).send(err);
  }
}

module.exports = { flowController };
