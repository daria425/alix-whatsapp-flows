const axios = require("axios");
class LLMService {
  constructor(api_base) {
    this.api_base = api_base;
  }
  async make_llm_request(requestBody) {
    const response = await axios({
      headers: {
        "Content-Type": "application/json",
      },
      method: "post",
      url: `${this.api_base}llm`,
      data: requestBody,
    });
    return response;
  }
}

module.exports = {
  LLMService,
};
