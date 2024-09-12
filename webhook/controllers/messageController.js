const {
  MessageHandlerService,
  FlowTriggerService,
} = require("../services/MessageHandlerService");
const { firestore } = require("../config/firestore.config");
async function handleMessage(req, res, next) {
  try {
    console.log(req.body);
    const messageHandler = req.headers["client-side-trigger"]
      ? new FlowTriggerService({
          req,
          res,
          organizationPhoneNumber: req.body.organizationPhoneNumber,
          firestore,
          clientSideTriggered: true,
        })
      : new MessageHandlerService({
          req,
          res,
          organizationPhoneNumber: req.body.To,
          firestore,
          clientSideTriggered: false,
        });
    await messageHandler.handle();
  } catch (err) {
    next(err);
  }
}
module.exports = {
  handleMessage,
};
