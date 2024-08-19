class UserService {
  constructor(db) {
    this.db = db;
  }

  async getOrganization(organizationNumber) {
    try {
      const collection = this.db.collection("organizations");
      const organization = await collection.findOne({
        "organizationPhoneNumber": organizationNumber,
      });
      return organization;
    } catch (err) {
      console.error(err);
      throw err; // Consider re-throwing for higher-level error handling
    }
  }

  async updateOrganizationWithContact(organizationNumber, contactId) {
    try {
      const collection = this.db.collection("organizations");
      await collection.updateOne(
        { "organizationPhoneNumber": organizationNumber },
        {
          $push: {
            organizationContacts: contactId,
          },
        }
      );
    } catch (err) {
      console.error(err);
      throw err; // Consider re-throwing for higher-level error handling
    }
  }

  async saveUser(userData, organizationNumber) {
    try {
      const collection = this.db.collection("contacts");
      const user = await collection.findOne({ "WaId": userData.WaId });

      if (user) {
        return; // User already exists; exit without further action
      }

      const organization = await this.getOrganization(organizationNumber);

      if (!organization) {
        throw new Error("Organization not found");
      }

      const result = await collection.insertOne({
        "WaId": userData.WaId,
        "ProfileName": userData.ProfileName,
        "organizationId": organization._id,
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
      const collection = this.db.collection("contacts");
      const user = await collection.findOne({ "WaId": recipient });
      return user;
    } catch (err) {
      console.error(err);
      throw err; // Consider re-throwing for higher-level error handling
    }
  }
}

module.exports = { UserService };
