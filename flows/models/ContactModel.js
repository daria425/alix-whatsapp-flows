class ContactModel {
  constructor(db, messageStartTime, organizationPhoneNumber) {
    this.contactsCollection = db.collection("contacts");
    this.messageCollection = db.collection("messages");
    this.organizationsCollection = db.collection("organizations");
    this.flowHistoryCollection = db.collection("flow_history");
    this.organizationPhoneNumber = organizationPhoneNumber;
    this.messageStartTime = new Date(messageStartTime);
  }
  async saveContact(contactData) {
    try {
      const contactOrganization = await this.organizationsCollection.findOne({
        "organizationPhoneNumber": this.organizationPhoneNumber,
      });
      const contactOrganizationId = contactOrganization._id;
      const contact = await this.contactsCollection.findOne({
        "WaId": contactData.WaId,
        "organizationId": contactOrganizationId,
      });
      if (contact) {
        return;
      } else {
        await this.contactsCollection.insertOne({
          "WaId": contactData.WaId,
          "ProfileName": contactData.ProfileName,
          "organizationId": contactOrganizationId,
        });
      }
    } catch (err) {
      console.log(err);
    }
  }
  async getContact(recipient) {
    try {
      const contactOrganization = await this.organizationsCollection.findOne({
        "organizationPhoneNumber": this.organizationPhoneNumber,
      });
      const contactOrganizationId = contactOrganization._id;
      const contact = await this.contactsCollection.findOne({
        "WaId": recipient,
        "organizationId": contactOrganizationId,
      });
      return contact;
    } catch (err) {
      console.log(err);
    }
  }

  async getContactDetail(recipient, detailField) {
    const contactOrganization = await this.organizationsCollection.findOne({
      "organizationPhoneNumber": this.organizationPhoneNumber,
    });
    const contactOrganizationId = contactOrganization._id;
    const contact = await this.contactsCollection.findOne({
      "WaId": recipient,
      "organizationId": contactOrganizationId,
    });
    return contact[detailField];
  }

  async updateContact(recipient, updateDoc) {
    const update = { ...updateDoc, "LastSeenAt": new Date() };
    const filteredUpdate = Object.fromEntries(
      Object.entries(update).filter(([_, val]) => val !== undefined)
    );
    try {
      const contactOrganization = await this.organizationsCollection.findOne({
        "organizationPhoneNumber": this.organizationPhoneNumber,
      });
      const contactOrganizationId = contactOrganization._id;
      await this.contactsCollection.findOneAndUpdate(
        { "WaId": recipient, "organizationId": contactOrganizationId },
        { "$set": filteredUpdate }
      );
    } catch (err) {
      console.log(err);
    }
  }
  async updateContactNestedField(recipient, updatePath, updateDoc, updateKey) {
    try {
      const contactOrganization = await this.organizationsCollection.findOne({
        organizationPhoneNumber: this.organizationPhoneNumber,
      });
      const contactOrganizationId = contactOrganization._id;
      let updateOperation;
      const isArrayField = Array.isArray(updateDoc[updateKey]);
      console.log("UPDATE DOC IS HERE", updateDoc);
      console.log("is it an array", isArrayField, updateDoc[updateKey]);
      if (isArrayField) {
        updateOperation = {
          $push: {
            [updatePath]: { $each: updateDoc[updateKey] },
          },
        };
      } else {
        // Use $set for non-array fields
        updateOperation = {
          $set: {
            [updatePath]: updateDoc[updateKey] ?? updateDoc,
          },
        };
      }

      await this.contactsCollection.findOneAndUpdate(
        { WaId: recipient, organizationId: contactOrganizationId },
        updateOperation,
        { upsert: true } // Create the document if it doesn't exist
      );
    } catch (err) {
      console.error("Error updating nested field:", err);
    }
  }

  async incrementContactField(recipient, update) {
    try {
      const contactOrganization = await this.organizationsCollection.findOne({
        "organizationPhoneNumber": this.organizationPhoneNumber,
      });
      const contactOrganizationId = contactOrganization._id;
      await this.contactsCollection.findOneAndUpdate(
        { "WaId": recipient, "organizationId": contactOrganizationId },
        { "$inc": update }
      );
    } catch (err) {
      console.log(err);
    }
  }
  async saveContactMessage(recipient, message) {
    const contact = await this.getContact(recipient);
    const messageToSave = {
      ...message,
      OrganizationId: contact.organizationId,
      ContactId: contact._id,
      ResponseTime: new Date() - this.messageStartTime,
    };
    const insertedMessage = await this.messageCollection.insertOne(
      messageToSave
    );
    return insertedMessage.insertedId;
  }
  async addMessageSid(messageId, sid) {
    await this.messageCollection.findOneAndUpdate(
      { "_id": messageId },
      { $set: { MessageSid: sid } }
    );
  }
}

module.exports = {
  ContactModel,
};
