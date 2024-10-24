const { FlowTriggerService } = require("../services/MessageHandlerService");
const { firestore } = require("../config/firestore.config");
const sendSurveyReminder = async (req, res, next) => {
  //add flow and contactList to req body in middleware
  const messageHandler = new FlowTriggerService({
    req,
    res,
    organizationPhoneNumber: req.body.organizationPhoneNumber,
    firestore,
    clientSideTriggered: false,
    isReminder: true,
  });
  await messageHandler.handle();
};

module.exports = {
  sendSurveyReminder,
};
