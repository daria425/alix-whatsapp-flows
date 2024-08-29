class DatabaseService {
  constructor(db) {
    this.db = db;
    this.contactCollection = this.db.collection("contacts");
    this.organizationCollection = this.db.collection("organizations");
    this.messagesCollection = this.db.collection("messages");
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
  async registerFlowCompletion(recipient, incrementDoc) {
    try {
      await this.contactCollection.findOneAndUpdate(
        { "WaId": recipient },
        {
          $inc: incrementDoc,
        }
      );
    } catch (err) {
      console.error(err);
      throw err;
    }
  }
}

module.exports = { DatabaseService };
