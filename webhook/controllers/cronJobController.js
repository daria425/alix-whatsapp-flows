const { firestore } = require("../config/firestore.config");
const { OutboundFlowHandler } = require("../handlers/MessageHandlers");
const sendSurveyReminder = async (req, res, next) => {
  //add flow and contactList to req body in middleware
  const messageHandler = new OutboundFlowHandler({
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
