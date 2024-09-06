const {
  MessageHandlerService,
  FlowTriggerService,
} = require("../services/MessageHandlerService");
const { firestore } = require("../config/firestore.config");
async function handleMessage(req, res, next) {
  try {
    console.log(req.body);
    const messageHandler = req.headers["client-side-trigger"]
      ? new FlowTriggerService(req, res, req.body.organizationNumber, firestore)
      : new MessageHandlerService(req, res, req.body.To, firestore);
    await messageHandler.handle();
  } catch (err) {
    next(err);
  }
}
module.exports = {
  handleMessage,
};
