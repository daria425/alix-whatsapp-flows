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
  async updateMessageStatus(messageSid, status) {
    try {
      const updatedMessage = await this.messagesCollection.findOneAndUpdate(
        { MessageSid: messageSid },
        { $set: { Status: status } }
      );
      if (updatedMessage.clientSideTriggered) {
        await this.updateFlow(updatedMessage.trackedFlowId, status);
      }
      console.log(`Message status updated to ${status}`);
    } catch (err) {
      console.error(err);
    }
  }

  async saveFlow({ WaId, trackedFlowId, flowName, clientSideTriggered }) {
    try {
      const contact = await this.getUser(WaId);
      const newFlowDoc = {
        CreatedAt: new Date(),
        flowName: flowName,
        ContactId: contact._id,
        OrganizationId: contact.organizationId,
        Status: "sent",
        clientSideTriggered,
        trackedFlowId,
      };
      await this.sentFlowsCollection.insertOne(newFlowDoc);
    } catch (err) {
      console.error(err);
    }
  }
  async updateFlow(flowId, statusUpdate) {
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

module.exports = { DatabaseService };
