const { client } = require("../config/twilio.config");

const sendMessage = async (messageContent) => {
  const msg = await client.messages.create(messageContent);
  return msg.sid; //Unique id of message, used to track delivery status
};

module.exports = {
  sendMessage,
};
