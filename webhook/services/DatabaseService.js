const { ObjectId } = require("mongodb");
const { logFlowStatus } = require("../helpers/logging.helpers");
/**
 * Service class to handle database operations related to contacts, organizations, messages, and flows.
 */
class DatabaseService {
  /**
   * List of flow names that support bulk completion (when one flow with this name is set as completed, the rest are too, used for survey reminders).
   * @static
   * @type {string[]}
   */
  static BULK_COMPLETION_ENABLED_FLOWNAMES = ["survey"];
  /**
   * Initializes the DatabaseService instance with the provided database client.
   * @param {Db} db - The MongoDB database client instance.
   */
  constructor(db) {
    this.db = db;
    this.contactCollection = this.db.collection("contacts");
    this.organizationCollection = this.db.collection("organizations");
    this.messagesCollection = this.db.collection("messages");
    this.sentFlowsCollection = this.db.collection("flow_history");
    this.availableFlowsCollection = this.db.collection("flows");
  }
  /**
   * Retrieves an organization by its phone number.
   * @param {string} organizationNumber - The phone number of the organization.
   * @returns {Promise<Object|null>} The organization document or null if not found.
   */
  async getOrganization(organizationNumber) {
    try {
      const organization = await this.organizationCollection.findOne({
        "organizationPhoneNumber": organizationNumber,
      });
      return organization;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  /**
   * Updates a user's information in the database.
   * @param {string} WaId - The WhatsApp ID of the user.
   * @param {string} organizationPhoneNumber - The phone number of the organization the user belongs to.
   * @param {Object} updateDoc - The fields to update.
   * @returns {Promise<void>}
   */
  async updateUser(WaId, organizationPhoneNumber, updateDoc) {
    try {
      const contactOrganization = await this.organizationCollection.findOne({
        "organizationPhoneNumber": organizationPhoneNumber,
      });
      const contactOrganizationId = contactOrganization._id;
      const contact = await this.contactCollection.findOneAndUpdate(
        { "WaId": WaId, "organizationId": contactOrganizationId },
        { "$set": updateDoc }
      );
      console.log("found contact!!!!!!!", contact);
    } catch (err) {
      console.log(err);
    }
  }
  /**
   * Retrieves contacts who have not responded to a flow in the specified time window and sends a reminder.
   * @param {string} flowName - The name of the flow to check.
   * @param {Date} reminderTime - The time threshold for determining whether to send a reminder.
   * @param {string} organizationId - The ID of the organization whose contacts are being checked.
   * @param {string} env - The environment ("production" or otherwise) to adjust the response.
   * @returns {Promise<Object>} An object containing the flow document and list of contacts.
   */
  async getUnresponsiveContacts(flowName, reminderTime, organizationId, env) {
    const flow = await this.availableFlowsCollection.findOne({
      "flowName": flowName,
    });
    const unansweredSurveys = await this.sentFlowsCollection
      .aggregate([
        {
          $match: {
            "OrganizationId": new ObjectId(organizationId),
            "flowName": flowName,
            "Status": { $in: ["read", "delivered"] },
            "reminderSent": {
              $exists: false,
            },
            $or: [{ isReminder: { $exists: false } }, { isReminder: false }],
            "UpdatedAt": { $lt: reminderTime },
          },
        },
        {
          $lookup: {
            from: "contacts",
            localField: "ContactId",
            foreignField: "_id",
            as: "contactInfo",
          },
        },
        {
          $unwind: "$contactInfo",
        },
        {
          $match: {
            "contactInfo.reminderSent": { $exists: false },
          },
        },
      ])
      .toArray();
    const WaIds = unansweredSurveys.map((survey) => ({
      WaId: survey.contactInfo.WaId,
      ProfileName: survey.contactInfo.ProfileName,
    }));
    console.log(unansweredSurveys);
    const contactIds = unansweredSurveys.map(
      (survey) => survey.contactInfo._id
    );
    console.log(contactIds);
    await this.sentFlowsCollection.updateMany(
      { ContactId: { $in: contactIds }, "flowName": flowName },
      { $set: { "reminderSent": true } }
    );
    await this.contactCollection.updateMany(
      { _id: { $in: contactIds } },
      { $set: { "reminderSent": true } }
    );
    const testUser = { WaId: "38269372208", ProfileName: "Daria" };
    return {
      flow: flow,
      contactList: env === "production" ? [...WaIds, testUser] : [testUser],
    };
  }
  /**
   * Adds a contact to an organization's contact list.
   * @param {string} organizationNumber - The phone number of the organization.
   * @param {ObjectId} contactId - The ID of the contact to add.
   * @returns {Promise<void>}
   */
  async updateOrganizationWithContact(organizationNumber, contactId) {
    try {
      await this.organizationCollection.updateOne(
        { "organizationPhoneNumber": organizationNumber },
        {
          $push: {
            organizationContacts: contactId,
          },
        }
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  /**
   * Retrieves the messaging service SID associated with an organization.
   * @param {string} organizationPhoneNumber - The phone number of the organization.
   * @returns {Promise<string>} The messaging service SID (from twilio).
   */
  async getMessagingServiceSid(organizationPhoneNumber) {
    try {
      const organization = await this.organizationCollection.findOne({
        "organizationPhoneNumber": organizationPhoneNumber,
      });
      return organization.organizationMessagingServiceSid;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  /**
   * Saves a new user in the database and associates them with the organization.
   * @param {Object} userData - The user data to insert.
   * @param {string} organizationNumber - The phone number of the organization the user is associated with.
   * @returns {Promise<void>}
   */
  async saveUser(userData, organizationNumber) {
    try {
      const user = await this.contactCollection.findOne({
        "WaId": userData.WaId,
      });

      if (user) {
        return;
      }

      const organization = await this.getOrganization(organizationNumber);

      if (!organization) {
        throw new Error("Organization not found");
      }

      const result = await this.contactCollection.insertOne({
        "WaId": userData.WaId,
        "ProfileName": userData.ProfileName,
        "organizationId": organization._id,
        "CreatedAt": new Date(),
        "LastSeenAt": new Date(),
      });

      const insertedId = result.insertedId;
      await this.updateOrganizationWithContact(organizationNumber, insertedId);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  /**
   * Retrieves a user by their WhatsApp ID within a specific organization.
   * @param {string} recipient - The WhatsApp ID of the user.
   * @param {string} organizationPhoneNumber - The phone number of the organization the user belongs to.
   * @returns {Promise<Object|null>} The user document or null if not found.
   */
  async getUser(recipient, organizationPhoneNumber) {
    try {
      const userOrganization = await this.getOrganization(
        organizationPhoneNumber
      );
      console.log(userOrganization);
      const userOrganizationId = userOrganization._id;
      const user = await this.contactCollection.findOne({
        "WaId": recipient,
        "organizationId": userOrganizationId,
      });
      return user;
    } catch (err) {
      console.error(err);
      throw err; // Consider re-throwing for higher-level error handling
    }
  }
  /**
   * Saves a message to the database and associates it with a contact.
   * @param {Object} message - The message document to save.
   * @param {string} organizationPhoneNumber - The phone number of the organization the message is associated with.
   * @returns {Promise<void>}
   */
  async saveMessage(message, organizationPhoneNumber) {
    try {
      const contact = await this.getUser(message.WaId, organizationPhoneNumber);
      await this.messagesCollection.insertOne({
        ...message,
        ContactId: contact._id,
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  /**
   * Updates the status of a message.
   * @param {string} messageSid - The SID of the message to update.
   * @param {string} status - The new status of the message.
   * @returns {Promise<void>}
   * {@see {@link updateFlowStatus}}
   */
  async updateMessageStatus(messageSid, status) {
    try {
      const updatedMessage = await this.messagesCollection.findOneAndUpdate(
        { MessageSid: messageSid },
        { $set: { Status: status } }
      );

      await this.updateFlowStatus(updatedMessage.trackedFlowId, status);

      console.log(`Message status updated to ${status}`);
    } catch (err) {
      console.error(err);
    }
  }
  /**
   * Saves a flow to the database.
   * @param {Object} params - The parameters for saving the flow.
   * @param {string} params.WaId - WhatsApp ID of the user the flow is for.
   * @param {string} params.trackedFlowId - ID that the flow status and additional information is tracked by.
   * @param {string} params.flowName - Name of the flow.
   * @param {boolean} params.clientSideTriggered - Indicates if the flow was triggered client-side.
   * @param {string} params.organizationPhoneNumber - The phone number of the organization associated with the flow.
   * @param {boolean} [params.isReminder=false] - Indicates if the flow is a reminder.
   * @returns {Promise<void>}
   */
  async saveFlow({
    WaId,
    trackedFlowId,
    flowName,
    clientSideTriggered,
    organizationPhoneNumber,
    isReminder,
  }) {
    try {
      const contact = await this.getUser(WaId, organizationPhoneNumber);
      console.log(contact);
      const newFlowDoc = {
        CreatedAt: new Date(),
        flowName: flowName,
        ContactId: contact._id,
        OrganizationId: contact.organizationId,
        Status: "sent",
        clientSideTriggered,
        trackedFlowId,
        isReminder,
      };
      await this.sentFlowsCollection.insertOne(newFlowDoc);
    } catch (err) {
      console.error(err);
    }
  }
  /**
   * Updates the status of a flow.
   * @param {string} flowId - The ID of the flow to update.
   * @param {string} statusUpdate - The new status for the flow (e.g., "completed", "delivered").
   * @returns {Promise<void>}
   */
  async updateFlowStatus(flowId, statusUpdate) {
    const query = { "trackedFlowId": flowId };
    const update = {
      $set: {
        Status: statusUpdate,
        UpdatedAt: new Date(),
      },
    };
    if (statusUpdate === "completed") {
      const flow = await this.sentFlowsCollection.findOne(query);

      if (
        DatabaseService.BULK_COMPLETION_ENABLED_FLOWNAMES.includes(
          flow.flowName
        )
      ) {
        logFlowStatus(flowId, statusUpdate, true);
        await this.sentFlowsCollection.updateMany(
          {
            ContactId: flow.ContactId,
            flowName: flow.flowName,
          },
          update
        );
        return;
      } else {
        logFlowStatus(flowId, statusUpdate, false);
        await this.sentFlowsCollection.findOneAndUpdate(query, update);
      }
    } else if (statusUpdate === "delivered") {
      query.Status = { $nin: ["in_progress", "read", "completed"] };
      logFlowStatus(flowId, statusUpdate, false);
    } else {
      query.Status = { $nin: ["in_progress", "completed"] };
    }
    logFlowStatus(flowId, statusUpdate, false);
    await this.sentFlowsCollection.findOneAndUpdate(query, update);
  }
  /**
   * Updates the start time of a flow.
   * @param {string} flowId - The ID of the flow to update.
   * @returns {Promise<void>}
   */
  async updateFlowStartTime(flowId) {
    await this.sentFlowsCollection.findOneAndUpdate(
      { "trackedFlowId": flowId },
      {
        $set: {
          StartedAt: new Date(),
        },
      }
    );
  }
  /**
   * Adds a survey response to a flow.
   * @param {string} flowId - The ID of the flow to update.
   * @param {Object} update - The survey response to add.
   * @returns {Promise<void>}
   */
  async updateFlowSurvey(flowId, update) {
    await this.sentFlowsCollection.findOneAndUpdate(
      { "trackedFlowId": flowId },
      {
        $push: {
          surveyResponses: { ...update, CreatedAt: new Date() },
        },
      }
    );
  }
  /**
   * Updates the latest survey question sent in a flow with the user's response.
   * @param {string} flowId - The ID of the flow to update.
   * @param {string} userResponse - The user's response to the latest survey question.
   * @param {string} messageSid - The message SID associated with the user response.
   * @returns {Promise<void>}
   */
  async updateFlowWithResponse(flowId, userResponse, messageSid) {
    const flow = await this.sentFlowsCollection.findOne({
      "trackedFlowId": flowId,
    });
    const existingSurveyData = flow?.surveyResponses;
    if (!existingSurveyData || existingSurveyData.length === 0) {
      return;
    }
    const latestQuestion = existingSurveyData.sort(
      (a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt)
    )[0];
    await this.sentFlowsCollection.updateOne(
      {
        "trackedFlowId": flowId,
        "surveyResponses.CreatedAt": latestQuestion.CreatedAt,
      },
      {
        $set: {
          "surveyResponses.$.userResponse": userResponse,
          "surveyResponses.$.originalMessageSid": messageSid, // Add the userResponse property to the latest survey response
        },
      }
    );
  }
}

module.exports = { DatabaseService };
