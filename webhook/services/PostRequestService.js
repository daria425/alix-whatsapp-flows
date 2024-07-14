const axios = require("axios");

class PostRequestService {
  constructor(api_base) {
    this.api_base = api_base;
  }
  async make_request(urlPath, data) {
    const response = await axios({
      headers: {
        "Content-Type": "application/json",
      },
      method: "post",
      url: `${this.api_base}${urlPath}`,
      data: data,
    });
    return response;
  }
}

module.exports = {
  PostRequestService,
};
