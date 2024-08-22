const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const createTextMessage = (waId, textContent) => {
  const message = {
    from: messagingServiceSid,
    body: textContent,
    to: `whatsapp:+${waId}`,
  };
  console.log("to save", message);
  return message;
};

const createTemplateMessage = (waId, contentSid, templateVariables) => {
  const message = {
    from: messagingServiceSid,
    contentSid: contentSid,
    contentVariables: JSON.stringify(templateVariables),
    to: `whatsapp:+${waId}`,
    // messagingServiceSid: messagingServiceSid,
  };
  console.log("to save", message);
  return message;
};
module.exports = {
  createTextMessage,
  createTemplateMessage,
};
