const axios = require("axios");

/**
 * @class PostRequestService
 * Service class for making POST requests to flow microservice API (../../flows) and the AI microservice API handling transcription, translation and signposting descriptions.
 */
class PostRequestService {
  /**
   * Creates an instance of the PostRequestService class
   * @param {string} flow_api_base - The base URL for the flow API.
   * @param {string} transcription_api_base - The base URL for the transcription API.
   */
  constructor(flow_api_base, transcription_api_base) {
    this.flow_api_base = flow_api_base;
    this.transcription_api_base = transcription_api_base;
  }

  /**
   * Makes a POST request to the flow API.
   * @param {string} urlPath - The path to be appended to the base URL.
   * @param {Object} data - The data to be sent in the body of the request.
   * @returns {Promise<Object>} - The response object from the flow API.
   * @throws {Error} - Throws an error if the request fails.
   */
  async make_request(urlPath, data) {
    const response = await axios({
      headers: {
        "Content-Type": "application/json",
      },
      method: "post",
      url: `${this.flow_api_base}${urlPath}`,
      data: data,
    });
    return response;
  }

  /**
   * Sends POST request with voice message data to the transcription API (ai_api microservice) for async transcription.
   * @param {string} urlPath - The path to be appended to the base transcription API URL.
   * @param {Object} data - The voice message data to be sent.
   * @returns {Promise<Object>} - The response object from the transcription API.
   * @throws {Error} - Throws an error if the request fails.
   */
  async send_transcription_data(urlPath, data) {
    const response = await axios({
      headers: {
        "Content-Type": "application/json",
      },
      method: "post",
      url: `${this.transcription_api_base}${urlPath}`,
      data: data,
    });
    return response;
  }
}

module.exports = {
  PostRequestService,
};
