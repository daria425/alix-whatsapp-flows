const { ObjectId } = require("mongodb");
class DatabaseService {
  constructor(db) {
    this.db = db;
    this.contactCollection = this.db.collection("contacts");
    this.organizationCollection = this.db.collection("organizations");
    this.messagesCollection = this.db.collection("messages");
    this.sentFlowsCollection = this.db.collection("flow_history");
    this.availableFlowsCollection = this.db.collection("flows");
  }

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
            "Status": "read",
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
      throw err; // Consider re-throwing for higher-level error handling
    }
  }

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
  async updateFlowStatus(flowId, statusUpdate) {
    if (statusUpdate === "delivered") {
      await this.sentFlowsCollection.findOneAndUpdate(
        {
          "trackedFlowId": flowId,
          "Status": {
            $ne: "read",
          },
        },
        {
          $set: {
            Status: statusUpdate,
            UpdatedAt: new Date(),
          },
        }
      );
    } else {
      await this.sentFlowsCollection.findOneAndUpdate(
        { "trackedFlowId": flowId },
        {
          $set: {
            Status: statusUpdate,
            UpdatedAt: new Date(),
          },
        }
      );
    }
  }
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
