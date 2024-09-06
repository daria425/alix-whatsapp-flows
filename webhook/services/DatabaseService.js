const { format } = require("date-fns");
const { ObjectId } = require("mongodb");
class DatabaseService {
  constructor(db) {
    this.db = db;
    this.contactCollection = this.db.collection("contacts");
    this.organizationCollection = this.db.collection("organizations");
    this.messagesCollection = this.db.collection("messages");
    this.completedFlowsCollection = this.db.collection("completed_flows");
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

  async getUser(recipient) {
    try {
      const user = await this.contactCollection.findOne({ "WaId": recipient });
      return user;
    } catch (err) {
      console.error(err);
      throw err; // Consider re-throwing for higher-level error handling
    }
  }
  async saveMessage(message) {
    try {
      const contact = await this.getUser(message.WaId);
      await this.messagesCollection.insertOne({
        ...message,
        ContactId: contact._id,
      });
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  async registerFlowCompletion(recipient, incrementDoc, organizationNumber) {
    try {
      const organization = await this.getOrganization(organizationNumber);
      const currentDate = format(new Date(), "yyyy-MM-dd");
      await this.contactCollection.findOneAndUpdate(
        { "WaId": recipient },
        {
          $inc: incrementDoc,
        }
      );
      await this.completedFlowsCollection.findOneAndUpdate(
        {
          organizationId: organization._id,
          date: currentDate,
        },
        {
          $inc: incrementDoc,
        },
        { upsert: true }
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
  async updateMessageStatus(messageSid, status) {
    try {
      await this.messagesCollection.findOneAndUpdate(
        { MessageSid: messageSid },
        { $set: { Status: status } }
      );
      console.log(`Message status updated to ${status}`);
    } catch (err) {
      console.error(err);
    }
  }
  async checkFlow(flowId, organizationId) {
    try {
      console.log(flowId);
      const isEnabled = await this.organizationCollection.findOne({
        _id: organizationId,
        "enabledFlowIds": new ObjectId(flowId),
      });
      return isEnabled;
    } catch (err) {
      console.error(err);
    }
  }
}

module.exports = { DatabaseService };
