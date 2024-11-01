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
};
