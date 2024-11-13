const {
  InboundMessageHandler,
  OutboundFlowHandler,
} = require("../handlers/MessageHandlers");
const { firestore } = require("../config/firestore.config");

/**
 * Handles incoming messages by initializing the appropriate service
 * based on the "client-side-trigger" header and invoking the message handler.
 *
 * @param {Object} req - The HTTP request object, containing headers and body.
 * @param {Object} req.body - The body of the request containing message data.
 * @param {string} req.body.organizationPhoneNumber - Phone number for organization, used by OutboundFlowHandler, sent from front-end.
 * @param {string} req.body.To - Recipient phone number, used by InboundMessageHandler.
 * @param {Object} res - The HTTP response object for sending responses.
 * @param {Function} next - Express middleware function for handling errors.
 * @throws Will call `next` with an error if the message handling fails.
 * @example
 * // Sample request body for OutboundFlowHandler
 * // {
 * //   "flow": {
 * //     "_id": { "$oid": "" },
 * //     "organizationIds": [{ "$oid": "" }],
 * //     "isSendable": true,
 * //     "flowName": "survey"
 * //   },
 * //   "organizationPhoneNumber": "whatsapp:+44---",
 * //   "contactList": [{
 * //     "WaId": "----",
 * //     "ProfileName": "Daria Naumova"
 * //   }]
 * // }
 *
 * @example
 * // Sample request body for InboundMessageHandler
 * // {
 * //   "SmsMessageSid": "----",
 * //   "NumMedia": "0",
 * //   "ProfileName": "Daria Naumova",
 * //   "MessageType": "text",
 * //   "SmsSid": "----",
 * //   "WaId": "-----",
 * //   "SmsStatus": "received",
 * //   "Body": "hi",
 * //   "To": "whatsapp:+44----",
 * //   "MessagingServiceSid": "----",
 * //   "NumSegments": "1",
 * //   "ReferralNumMedia": "0",
 * //   "MessageSid": "----",
 * //   "AccountSid": "----",
 * //   "From": "whatsapp:+-----",
 * //   "ApiVersion": "2010-04-01"
 * }
 */

async function handleMessage(req, res, next) {
  try {
    /**
     * Determines the appropriate service to handle the message based on
     * the presence of a "client-side-trigger" header.
     * - OutboundFlowHandler handles client-side triggered messages from front-end.
     * - InboundMessageHandler handles messages sent by WhatsApp users/Twilio's API.
     */
    const messageHandler = req.headers["client-side-trigger"]
      ? new OutboundFlowHandler({
          req,
          res,
          organizationPhoneNumber: req.body.organizationPhoneNumber,
          firestore,
          clientSideTriggered: true,
          isReminder: false,
        })
      : new InboundMessageHandler({
          req,
          res,
          organizationPhoneNumber: req.body.To,
          firestore,
          clientSideTriggered: false,
          isReminder: false,
        });
    await messageHandler.handle();
  } catch (err) {
    next(err);
  }
}
module.exports = {
  handleMessage,
};
