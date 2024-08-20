const { MessageHandlerService } = require("../services/MessageHandlerService");

async function handleMessage(req, res, next) {
  const messageHandler = new MessageHandlerService(req, res);
  await messageHandler.handle();
}
module.exports = {
  handleMessage,
};
