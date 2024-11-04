const { client } = require("../config/twilio.config");

const sendMessage = async (messageContent) => {
  const msg = await client.messages.create(messageContent);
  return msg.sid; //Unique id of message, used to track delivery status
};

const createTextMessage = ({ waId, textContent, messagingServiceSid }) => {
  const message = {
    from: messagingServiceSid,
    body: textContent,
    to: `whatsapp:+${waId}`,
  };
  return message;
};

const createTemplateMessage = ({
  waId,
  contentSid,
  templateVariables,
  messagingServiceSid,
}) => {
  const message = {
    from: messagingServiceSid,
    contentSid: contentSid,
    contentVariables: JSON.stringify(templateVariables),
    to: `whatsapp:+${waId}`,
  };
  return message;
};
module.exports = {
  createTextMessage,
  createTemplateMessage,
  sendMessage,
};
