const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const axios = require("axios");
async function listTemplates() {
  const auth = {
    username: accountSid,
    password: authToken,
  };

  const response = await axios.get("https://content.twilio.com/v1/Content", {
    auth,
  });
  return response.data;
}

async function findTemplateSid(templateName) {
  try {
    const templates = await listTemplates();
    const foundTemplate = templates.contents.find(
      (template) => template.friendly_name === templateName
    );
    if (foundTemplate) {
      return {
        templateSid: foundTemplate.sid,
        templateName: templateName,
      };
    }
  } catch (err) {
    console.log(err);
    return null;
  }
}

module.exports = { findTemplateSid };
